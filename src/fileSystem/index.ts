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
import { EXTENSION_NAME, FS_SCHEME, ZERO_WIDTH_SPACE } from "../constants";
import { GistFile, Store } from "../store";
import { forkGist, getGist } from "../store/actions";
import { ensureAuthenticated } from "../store/auth";
import {
  byteArrayToString,
  getGistDetailsFromUri,
  isTempGistUri,
  openGistAsWorkspace,
  stringToByteArray,
  uriToFileName
} from "../utils";
import { getFileContents, updateGistFiles } from "./api";
import { addFile, renameFile } from "./git";
import { inMemoryFs } from "./memory";
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

  private async getFileFromUri(uri: Uri): Promise<GistFile> {
    const { gistId, file } = getGistDetailsFromUri(uri);
    let gist = this.store.gists.find((gist) => gist.id === gistId);

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
    throw FileSystemError.NoPermissions(
      "Directories aren't supported by GitHub Gist."
    );
  }

  async delete(uri: Uri, options: { recursive: boolean }): Promise<void> {
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
    if (isTempGistUri(uri)) {
      return inMemoryFs.readFile(uri);
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

      const gist = await getGist(gistId);

      // TODO: Check to see if the file list is truncated, and if
      // so, retrieve the full contents from the service.
      const files = Object.keys(gist.files).map((file) => [
        file,
        FileType.File
      ]);

      // @ts-ignore
      return files;
    } else {
      throw FileSystemError.FileNotFound;
    }
  }

  async rename(
    oldUri: Uri,
    newUri: Uri,
    options: { overwrite: boolean }
  ): Promise<void> {
    await ensureAuthenticated();

    const file = await this.getFileFromUri(oldUri);
    const { gistId } = getGistDetailsFromUri(oldUri);
    const newFileName = uriToFileName(newUri);

    if (isBinaryPath(file.filename!)) {
      await renameFile(gistId, file.filename!, newFileName);
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
    if (uri.path === "/") {
      return {
        type: FileType.Directory,
        size: 0,
        ctime: 0,
        mtime: 0
      };
    }

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
    if (isTempGistUri(uri)) {
      return inMemoryFs.writeFile(uri, content, options);
    }

    const { gistId } = getGistDetailsFromUri(uri);
    await ensureAuthenticated();

    if (!this.store.gists.find((gist) => gist.id === gistId)) {
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
      await addFile(gistId, path.basename(uri.path), content);

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
}
