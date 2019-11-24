import { Disposable, Event, EventEmitter, FileChangeEvent, FileStat, FileSystemError, FileSystemProvider, FileType, Uri, window, workspace } from "vscode";
import { updateGist, getGist, GistFile } from "./api";
import { FS_SCHEME, ZERO_WIDTH_SPACE } from "./constants";
import { getGistDetailsFromUri, uriToFileName } from "./utils";
import { ensureAuthenticated } from "./auth";

export class GistFileSystemProvider implements FileSystemProvider {
  private _gist: any;

  private getFileFromUri(uri: Uri): GistFile {
    const fileName = uriToFileName(uri);
    return this._gist.files[fileName];
  }

  async copy?(source: Uri, destination: Uri, options: { overwrite: boolean }): Promise<void> {
    await ensureAuthenticated();

    const file = this.getFileFromUri(source);
    const filename = uriToFileName(destination);

    await updateGist(this._gist.id, filename, {
          content: file.content!
    });

    this._gist.files[filename] = {
      ...file,
      filename
    };;
  }

  createDirectory(uri: Uri): void {
    throw FileSystemError.NoPermissions("Directories aren't supported by GitHub Gist.");
  }

  async delete(uri: Uri, options: { recursive: boolean }): Promise<void> {
    await ensureAuthenticated();

    const { filename } = this.getFileFromUri(uri);
 
    await updateGist(this._gist.id, filename!, null);

    delete this._gist.files[filename!];
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    // TODO: Check to see if the file is truncated, and if so,
    // retrieve the full contents from the service.
    const { content } = this.getFileFromUri(uri);
    return Buffer.from(content!);
  }

  async readDirectory(uri: Uri): Promise<[string, FileType][]> {
    if (uri.path === "/") {
      const { gistId } = getGistDetailsFromUri(uri);
      this._gist = await getGist(gistId);

      // TODO: Check to see if the file list is truncated, and if
      // so, retrieve the full contents from the service.
      const files = Object.keys(this._gist.files).map(file => [
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

    const file = this.getFileFromUri(oldUri);
    const newFileName = uriToFileName(newUri);
  
    await updateGist(this._gist.id, file.filename!, {
      filename: newFileName
    });

    delete this._gist.files[file.filename!];

    file.filename = newFileName;
    this._gist.files[newFileName] = file;
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

    const file = this.getFileFromUri(uri);

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
    
    let file = this.getFileFromUri(uri);

    if (!file) {
      const newFileName = uriToFileName(uri);
      file = {
        filename: newFileName,
        truncated: false
      };
      this._gist.files[newFileName] = file;
    }
    
    let newContent = content.toString();
    if (newContent.trim().length === 0) {
      // Gist doesn't allow files to be blank
      newContent = ZERO_WIDTH_SPACE;
    }

    file.content = newContent;
    file.size = newContent.length;
    
    await updateGist(this._gist.id, file.filename!, {
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