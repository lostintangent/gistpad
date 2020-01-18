import {
  Disposable,
  Event,
  EventEmitter,
  FileChangeEvent,
  FileStat,
  FileSystemProvider,
  FileType,
  Uri
} from "vscode";
import { TEMP_GIST_ID } from "../constants";
import { Gist, GistFile } from "../store";
import { fileNameToUri, stringToByteArray } from "../utils";

interface InMemoryFileContents {
  [uri: string]: Uint8Array;
}

class InMemoryFileSystemProvider implements FileSystemProvider {
  private _onDidChangeFile = new EventEmitter<FileChangeEvent[]>();
  public readonly onDidChangeFile: Event<FileChangeEvent[]> = this
    ._onDidChangeFile.event;

  fileContents: InMemoryFileContents = {};

  watch(
    uri: Uri,
    options: { recursive: boolean; excludes: string[] }
  ): Disposable {
    throw new Error("Method not implemented.");
  }

  stat(uri: Uri): FileStat | Thenable<FileStat> {
    throw new Error("Method not implemented.");
  }

  readDirectory(
    uri: Uri
  ): [string, FileType][] | Thenable<[string, FileType][]> {
    throw new Error("Method not implemented.");
  }

  createDirectory(uri: Uri): void | Thenable<void> {
    throw new Error("Method not implemented.");
  }

  readFile(uri: Uri): Uint8Array | Thenable<Uint8Array> {
    return this.fileContents[uri.toString()];
  }

  writeFile(
    uri: Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): void | Thenable<void> {
    this.fileContents[uri.toString()] = content;
  }

  delete(uri: Uri, options: { recursive: boolean }): void | Thenable<void> {
    delete this.fileContents[uri.toString()];
  }

  rename(
    oldUri: Uri,
    newUri: Uri,
    options: { overwrite: boolean }
  ): void | Thenable<void> {
    this.fileContents[newUri.toString()] = this.fileContents[oldUri.toString()];
    this.delete(oldUri, { recursive: false });
  }
}

export const inMemoryFs = new InMemoryFileSystemProvider();

export async function newGistInMemory(
  gistFiles: GistFile[],
  isPublic: boolean,
  description?: string
): Promise<Gist> {
  let files: { [fileName: string]: GistFile } = {};
  gistFiles.forEach((file) => {
    const fileUri = fileNameToUri(TEMP_GIST_ID, file.filename!);
    const contents = stringToByteArray(file.content!);

    inMemoryFs.writeFile(fileUri, contents, {
      create: true,
      overwrite: true
    });

    files[file.filename!] = file;
  });

  return {
    id: TEMP_GIST_ID,
    files,
    html_url: "",
    truncated: false,
    url: "",
    description: description!,
    owner: {
      id: 1,
      login: "",
      avatar_url: "",
      html_url: ""
    },
    public: isPublic,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    history: [],
    git_pull_url: ""
  };
}
