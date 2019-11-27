import { Disposable, Event, EventEmitter, FileChangeEvent, FileStat, FileSystemError, FileSystemProvider, FileType, Uri, window, workspace } from "vscode";
import { updateGist, getGist, GistFile, Gist } from "./api";
import { FS_SCHEME, ZERO_WIDTH_SPACE } from "./constants";
import { getGistDetailsFromUri, uriToFileName } from "./utils";
import { ensureAuthenticated } from "./auth";

export class GistFileSystemProvider implements FileSystemProvider {
  private _gists = new Map<string, Gist>();

  private async getFileFromUri(uri: Uri): Promise<GistFile> {
    const { gistId, file } = getGistDetailsFromUri(uri);

    if (!this._gists.has(gistId)) {
      const gist = await getGist(gistId);
      this._gists.set(gistId, gist);
    }

    return this._gists.get(gistId)!.files[file];
  }

  async copy?(source: Uri, destination: Uri, options: { overwrite: boolean }): Promise<void> {
    await ensureAuthenticated();

    const { gistId } = getGistDetailsFromUri(source);
    const newFileName = uriToFileName(destination);
    
    const file = await this.getFileFromUri(source);
    await updateGist(gistId, newFileName, {
      content: file.content!
    });

    this._gists.get(gistId)!.files[newFileName] = {
      ...file,
      filename: newFileName
    };
  }

  createDirectory(uri: Uri): void {
    throw FileSystemError.NoPermissions("Directories aren't supported by GitHub Gist.");
  }

  async delete(uri: Uri, options: { recursive: boolean }): Promise<void> {
    await ensureAuthenticated();

    const { gistId, file } = getGistDetailsFromUri(uri);
    await updateGist(gistId, file!, null);

    delete this._gists.get(gistId)!.files[file!];
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    // TODO: Check to see if the file is truncated, and if so,
    // retrieve the full contents from the service.

    const { content } = await this.getFileFromUri(uri);
    return Buffer.from(content!);
  }

  async readDirectory(uri: Uri): Promise<[string, FileType][]> {
    if (uri.path === "/") {
      const { gistId } = getGistDetailsFromUri(uri);
      const gist = await getGist(gistId);
      this._gists.set(gistId, gist);

      // TODO: Check to see if the file list is truncated, and if
      // so, retrieve the full contents from the service.
      const files = Object.keys(gist.files).map(file => [
        file,
        FileType.File
      ]);

      setTimeout(() => {
        window.showTextDocument(uri.with({ path: `/${files[0][0]}` }))
      }, 500);

      // @ts-ignore
      return files;
    }
     else {
        throw FileSystemError.FileNotFound;
     }
  }

  async rename(oldUri: Uri, newUri: Uri, options: { overwrite: boolean }): Promise<void> {
    await ensureAuthenticated();

    const file = await this.getFileFromUri(oldUri);
    const { gistId } = getGistDetailsFromUri(oldUri);
    const newFileName = uriToFileName(newUri);
  
    await updateGist(gistId, file.filename!, {
      filename: newFileName
    });

    delete this._gists.get(gistId)!.files[file.filename!];

    file.filename = newFileName;
    this._gists.get(gistId)!.files[newFileName] = file;
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
      this._gists.get(gistId)!.files[newFileName] = file;
    }
    
    let newContent = content.toString();
    if (newContent.trim().length === 0) {
      // Gist doesn't allow files to be blank
      newContent = ZERO_WIDTH_SPACE;
    }

    file.content = newContent;
    file.size = newContent.length;
    
    await updateGist(gistId, file.filename!, {
      content: file.content
    });
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

export function registerFileSystemProvider() {
  const provider = new GistFileSystemProvider();
  workspace.registerFileSystemProvider(FS_SCHEME, provider);
  return provider;
}