import * as path from "path";
import { Subject } from "rxjs";
import { buffer, debounceTime } from "rxjs/operators";
import {
  commands,
  Disposable,
  Event,
  EventEmitter,
  FileChangeEvent,
  FileChangeType,
  FileStat,
  FileSystemError,
  FileSystemProvider,
  FileType,
  ProgressLocation,
  Uri,
  window,
  workspace
} from "vscode";
import {
  DIRECTORY_SEPARATOR,
  ENCODED_DIRECTORY_SEPARATOR,
  EXTENSION_NAME,
  FS_SCHEME,
  ZERO_WIDTH_SPACE
} from "../constants";
import { GistFile, Store } from "../store";
import { forkGist, getGist } from "../store/actions";
import { ensureAuthenticated } from "../store/auth";
import {
  byteArrayToString,
  encodeDirectoryUri,
  getGistDetailsFromUri,
  isOwnedGist,
  isTempGistUri,
  openGistAsWorkspace,
  stringToByteArray,
  uriToFileName
} from "../utils";
import { getFileContents, updateGistFiles } from "./api";
import * as gitFS from "./git";
import { registerInputFileSystemProvider } from "./input";
import * as tempFS from "./temp";
const isBinaryPath = require("is-binary-path");

interface WriteOperation {
  gistId: string;
  filename: string;
  uri: Uri;
  type: FileChangeType;
  content?: string;
  resolve: () => void;
}

let count = 0;
export class GistFileSystemProvider implements FileSystemProvider {
  private _pendingWrites = new Subject<WriteOperation>();

  private _onDidChangeFile = new EventEmitter<FileChangeEvent[]>();
  public readonly onDidChangeFile: Event<FileChangeEvent[]> = this
    ._onDidChangeFile.event;

  constructor(private store: Store) {
    this._pendingWrites
      .pipe(buffer(this._pendingWrites.pipe(debounceTime(100))))
      .subscribe((operations: WriteOperation[]) => {
        const writesByGist = operations.reduce((map, operation) => {
          let operations = map.get(operation.gistId);
          if (!operations) {
            operations = [];
            map.set(operation.gistId, operations);
          }

          operations.push(operation);
          return map;
        }, new Map<string, WriteOperation[]>());

        writesByGist.forEach(async (writeOperations, gistId) => {
          await updateGistFiles(
            gistId,
            writeOperations.map((write) => {
              const value: GistFile | null =
                write.type === FileChangeType.Deleted
                  ? null
                  : {
                      filename: write.filename!,
                      content: write.content!
                    };
              return [write.filename, value];
            })
          );

          writeOperations.forEach((write) => write.resolve());
          this._onDidChangeFile.fire(writeOperations);
        });
      });
  }

  private async isDirectory(uri: Uri): Promise<boolean> {
    const { gistId } = getGistDetailsFromUri(uri);
    let gist = this.store.gists.find((gist) => gist.id === gistId);

    if (!gist) {
      gist = await getGist(gistId);
    }

    const prefix = uri.path
      .substr(1)
      .replace(DIRECTORY_SEPARATOR, ENCODED_DIRECTORY_SEPARATOR);
    return !!Object.keys(gist.files).find((file) => file.startsWith(prefix));
  }

  private async getFileFromUri(uri: Uri): Promise<GistFile> {
    const { gistId, file } = getGistDetailsFromUri(uri);
    let gist = this.store.gists
      .concat(this.store.starredGists)
      .find((gist) => gist.id === gistId);

    if (!gist) {
      gist = await getGist(gistId);
    }

    return gist.files[file];
  }

  // TODO: Enable for binary files
  async copy?(
    source: Uri,
    destination: Uri,
    options: { overwrite: boolean }
  ): Promise<void> {
    await ensureAuthenticated();

    const { gistId } = getGistDetailsFromUri(source);
    const newFileName = uriToFileName(destination);

    const file = await this.getFileFromUri(source);
    await updateGistFiles(gistId, [
      [
        newFileName,
        {
          content: file.content!
        }
      ]
    ]);

    this._onDidChangeFile.fire([
      {
        type: FileChangeType.Created,
        uri: destination
      }
    ]);
  }

  createDirectory(uri: Uri): void {
    // Gist doesn't actually support directories, so
    // we just no-op this function so that VS Code thinks
    // the directory was created when a file within a
    // directory is created (e.g. "/foo/bar.txt")
  }

  async delete(uri: Uri, options: { recursive: boolean }): Promise<void> {
    uri = encodeDirectoryUri(uri);

    if (isTempGistUri(uri)) {
      return tempFS.deleteFile(uri);
    }

    await ensureAuthenticated();

    const { gistId, file } = getGistDetailsFromUri(uri);
    return new Promise((resolve) => {
      this._pendingWrites.next({
        type: FileChangeType.Deleted,
        gistId,
        filename: file,
        uri,
        resolve
      });
    });
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    uri = encodeDirectoryUri(uri);

    if (isTempGistUri(uri)) {
      return tempFS.readFile(uri);
    }

    const file = await this.getFileFromUri(uri);
    let contents = await getFileContents(file);

    if (isBinaryPath(file.filename)) {
      return <any>contents;
    } else {
      if (contents.trim() === ZERO_WIDTH_SPACE) {
        contents = "";
      }
      return stringToByteArray(contents);
    }
  }

  async readDirectory(uri: Uri): Promise<[string, FileType][]> {
    if (uri.path === "/") {
      const { gistId } = getGistDetailsFromUri(uri);
      if (gistId === "new") {
        const gist = await commands.executeCommand<any>(
          `${EXTENSION_NAME}.newSecretGist`
        );
        openGistAsWorkspace(gist.id);
      } else if (gistId === "playground") {
        await commands.executeCommand(
          `${EXTENSION_NAME}.newPlayground`,
          null,
          /*openAsWorkspace*/ true
        );
      }

      let gist = this.store.gists
        .concat(this.store.starredGists)
        .find((gist) => gist.id === gistId);

      if (!gist) {
        gist = await getGist(gistId);
      }

      const seenDirectories: string[] = [];

      // @ts-ignore
      const files: [string, FileType][] = Object.keys(gist.files)
        .map((file) => {
          if (file.includes(ENCODED_DIRECTORY_SEPARATOR)) {
            const directory = file.split(ENCODED_DIRECTORY_SEPARATOR)[0];
            return [directory, FileType.Directory];
          } else {
            return [file, FileType.File];
          }
        })
        .filter(([file, fileType]) => {
          if (fileType === FileType.File) return true;

          // @ts-ignore
          if (seenDirectories.includes(file)) {
            return false;
          } else {
            // @ts-ignore
            seenDirectories.push(file);
            return true;
          }
        });

      return files;
    } else {
      const { gistId } = getGistDetailsFromUri(uri);

      let gist = this.store.gists
        .concat(this.store.starredGists)
        .find((gist) => gist.id === gistId);

      if (!gist) {
        gist = await getGist(gistId);
      }

      const prefix = uri.path
        .substr(1)
        .replace(DIRECTORY_SEPARATOR, ENCODED_DIRECTORY_SEPARATOR);

      const files: [string, FileType][] = Object.keys(gist.files)
        .filter((file) => file.startsWith(prefix))
        .map((file) => {
          const updatedFile = file.split(prefix)[1];
          if (updatedFile.includes(ENCODED_DIRECTORY_SEPARATOR)) {
            const directory = file.split(ENCODED_DIRECTORY_SEPARATOR)[0];
            return [directory, FileType.Directory];
          } else {
            return [updatedFile, FileType.File];
          }
        });

      if (files.length > 0) {
        return files;
      } else {
        throw FileSystemError.FileNotFound;
      }
    }
  }

  async rename(
    oldUri: Uri,
    newUri: Uri,
    options: { overwrite: boolean }
  ): Promise<void> {
    oldUri = encodeDirectoryUri(oldUri);
    newUri = encodeDirectoryUri(newUri);

    if (isTempGistUri(oldUri)) {
      return tempFS.renameFile(oldUri, newUri);
    }

    await ensureAuthenticated();

    const file = await this.getFileFromUri(oldUri);
    const { gistId } = getGistDetailsFromUri(oldUri);
    const newFileName = uriToFileName(newUri);

    if (isBinaryPath(file.filename!)) {
      await gitFS.renameFile(gistId, file.filename!, newFileName);
    } else {
      await updateGistFiles(gistId, [
        [
          file.filename!,
          {
            filename: newFileName
          }
        ]
      ]);
    }

    this._onDidChangeFile.fire([
      {
        type: FileChangeType.Deleted,
        uri: oldUri
      },
      {
        type: FileChangeType.Created,
        uri: newUri
      }
    ]);
  }

  async stat(uri: Uri): Promise<FileStat> {
    if (uri.path === DIRECTORY_SEPARATOR) {
      return {
        type: FileType.Directory,
        size: 0,
        ctime: 0,
        mtime: 0
      };
    } else if (uri.path.endsWith(DIRECTORY_SEPARATOR)) {
      if (this.isDirectory(uri)) {
        return {
          type: FileType.Directory,
          size: 0,
          ctime: 0,
          mtime: 0
        };
      }

      throw FileSystemError.FileNotFound(uri);
    }

    uri = encodeDirectoryUri(uri);

    const file = await this.getFileFromUri(uri);

    if (!file) {
      throw FileSystemError.FileNotFound(uri);
    }

    return {
      type: FileType.File,
      ctime: 0,
      mtime: ++count,
      size: file.size!
    };
  }

  async writeFile(
    uri: Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    uri = encodeDirectoryUri(uri);

    if (isTempGistUri(uri)) {
      return tempFS.writeFile(uri, content);
    }

    const { gistId } = getGistDetailsFromUri(uri);
    await ensureAuthenticated();

    if (!isOwnedGist(gistId)) {
      const response = await window.showInformationMessage(
        "You can't edit a Gist you don't own.",
        "Fork this Gist"
      );

      // TODO: Replace the edit after forking the gist
      if (response === "Fork this Gist") {
        await window.withProgress(
          {
            location: ProgressLocation.Notification,
            title: "Forking Gist..."
          },
          () => forkGist(gistId)
        );
      }
      return;
    }

    if (isBinaryPath(uri.path)) {
      await gitFS.addFile(gistId, path.basename(uri.path), content);

      this._onDidChangeFile.fire([
        {
          type: FileChangeType.Created,
          uri
        }
      ]);
    } else {
      const file = await this.getFileFromUri(uri);
      const type = file ? FileChangeType.Changed : FileChangeType.Created;

      return new Promise((resolve) => {
        this._pendingWrites.next({
          type,
          gistId,
          filename: uriToFileName(uri),
          content: byteArrayToString(content),
          uri,
          resolve
        });
      });
    }
  }

  watch(
    uri: Uri,
    options: { recursive: boolean; excludes: string[] }
  ): Disposable {
    return new Disposable(() => {});
  }
}

export function registerFileSystemProvider(store: Store) {
  workspace.registerFileSystemProvider(
    FS_SCHEME,
    new GistFileSystemProvider(store)
  );

  registerInputFileSystemProvider();
}
