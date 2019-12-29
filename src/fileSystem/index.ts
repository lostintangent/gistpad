import {
  Disposable,
  Event,
  EventEmitter,
  FileChangeEvent,
  FileStat,
  FileSystemError,
  FileSystemProvider,
  FileType,
  ProgressLocation,
  Uri,
  window,
  workspace
} from "vscode";
import { FS_SCHEME, ZERO_WIDTH_SPACE } from "../constants";
import { GistFile, IStore } from "../store";
import { forkGist, getGist, updateGist } from "../store/actions";
import { ensureAuthenticated } from "../store/auth";
import {
  getFileContents,
  getGistDetailsFromUri,
  stringToByteArray,
  uriToFileName
} from "../utils";

export class GistFileSystemProvider implements FileSystemProvider {
  constructor(private store: IStore) {}

  private async getFileFromUri(uri: Uri): Promise<GistFile> {
    const { gistId, file } = getGistDetailsFromUri(uri);

    let gist = this.store.gists.find((gist) => gist.id === gistId);
    if (!gist) {
      gist = await getGist(gistId);
    }

    return gist.files[file];
  }

  async copy?(
    source: Uri,
    destination: Uri,
    options: { overwrite: boolean }
  ): Promise<void> {
    await ensureAuthenticated();

    const { gistId } = getGistDetailsFromUri(source);
    const newFileName = uriToFileName(destination);

    const file = await this.getFileFromUri(source);
    await updateGist(gistId, newFileName, {
      filename: newFileName,
      content: file.content!
    });
  }

  createDirectory(uri: Uri): void {
    throw FileSystemError.NoPermissions(
      "Directories aren't supported by GitHub Gist."
    );
  }

  async delete(uri: Uri, options: { recursive: boolean }): Promise<void> {
    await ensureAuthenticated();

    const { gistId, file } = getGistDetailsFromUri(uri);
    await updateGist(gistId, file!, null);
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    const file = await this.getFileFromUri(uri);
    let contents = await getFileContents(file);

    if (
      !file.type!.startsWith("image") &&
      contents.trim() === ZERO_WIDTH_SPACE
    ) {
      contents = "";
    }

    return stringToByteArray(contents);
  }

  async readDirectory(uri: Uri): Promise<[string, FileType][]> {
    if (uri.path === "/") {
      const { gistId } = getGistDetailsFromUri(uri);
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

    await updateGist(gistId, file.filename!, {
      filename: newFileName
    });
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
      mtime: 0,
      size: file.size!
    };
  }

  async writeFile(
    uri: Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    await ensureAuthenticated();

    let file = await this.getFileFromUri(uri);
    const { gistId } = getGistDetailsFromUri(uri);

    if (!file) {
      const newFileName = uriToFileName(uri);
      file = {
        filename: newFileName,
        truncated: false
      };
    }

    let newContent = new TextDecoder().decode(content);
    if (newContent.trim().length === 0) {
      // Gist doesn't allow files to be blank
      newContent = ZERO_WIDTH_SPACE;
    }

    file.content = newContent;
    file.size = newContent.length;

    try {
      await updateGist(gistId, file.filename!, {
        filename: file.filename,
        content: file.content
      });
    } catch (e) {
      // TODO: Check the Gist owner vs. current owner and fail
      // based on that, as opposed to requiring a hit to the server.
      const response = await window.showInformationMessage(
        "You can't edit a Gist you don't own.",
        "Fork this Gist"
      );
      if (response === "Fork this Gist") {
        await window.withProgress(
          { location: ProgressLocation.Notification, title: "Forking Gist..." },
          () => forkGist(gistId)
        );
      }
    }
  }

  // Unimplemented members

  private _onDidChangeFile = new EventEmitter<FileChangeEvent[]>();
  public readonly onDidChangeFile: Event<FileChangeEvent[]> = this
    ._onDidChangeFile.event;

  watch(
    uri: Uri,
    options: { recursive: boolean; excludes: string[] }
  ): Disposable {
    return new Disposable(() => {});
  }
}

export function registerFileSystemProvider(store: IStore) {
  const provider = new GistFileSystemProvider(store);
  workspace.registerFileSystemProvider(FS_SCHEME, provider);
  return provider;
}
