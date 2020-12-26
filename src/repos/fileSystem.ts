import * as vscode from "vscode";
import { stringToByteArray } from "../utils";
import { Repository, store, TreeItem } from "./store";
import {
  addRepoFile,
  deleteRepoFile,
  getRepoFile,
  renameFile,
  updateRepoFile
} from "./store/actions";

export const REPO_SCHEME = "repo";
const REPO_QUERY = `${REPO_SCHEME}=`;

export class RepoFileSystemProvider implements vscode.FileSystemProvider {
  private _onDidChangeFile = new vscode.EventEmitter<
    vscode.FileChangeEvent[]
  >();
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this
    ._onDidChangeFile.event;

  static getFileInfo(uri: vscode.Uri): [string, string] | undefined {
    if (!uri.query.startsWith(REPO_QUERY)) {
      return;
    }

    const repo = decodeURIComponent(uri.query.replace(REPO_QUERY, ""));
    const path = uri.path.startsWith("/") ? uri.path.substr(1) : uri.path;

    return [repo, path];
  }

  static getRepoInfo(
    uri: vscode.Uri
  ): [Repository, TreeItem | undefined] | undefined {
    const match = RepoFileSystemProvider.getFileInfo(uri);

    if (!match) {
      return;
    }

    const repository = store.repos.find((repo) => repo.name === match[0])!;
    const file = repository!.tree?.tree.find((file) => file.path === match[1]);

    return [repository, file];
  }

  static getFileUri(repo: string, filePath: string = "") {
    return vscode.Uri.parse(
      `${REPO_SCHEME}:/${filePath}?${REPO_QUERY}${encodeURIComponent(repo)}`
    );
  }

  static isRepoDocument(document: vscode.TextDocument, repo?: string) {
    return (
      document.uri.scheme === REPO_SCHEME &&
      (!repo || document.uri.query === `${REPO_QUERY}${repo}`)
    );
  }

  stat(uri: vscode.Uri): vscode.FileStat {
    if (uri.path === "/") {
      return {
        type: vscode.FileType.Directory,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 100
      };
    }

    const fileInfo = RepoFileSystemProvider.getRepoInfo(uri);

    if (fileInfo && fileInfo[1]) {
      const type =
        fileInfo[1].type === "blob"
          ? vscode.FileType.File
          : vscode.FileType.Directory;

      return {
        type,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 100
      };
    } else {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const [repository, file] = RepoFileSystemProvider.getRepoInfo(uri)!;

    const contents = await getRepoFile(repository.name, file!.sha);

    return stringToByteArray(contents);
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    const [repository, file] = RepoFileSystemProvider.getRepoInfo(uri)!;

    if (!file) {
      const [, filePath] = RepoFileSystemProvider.getFileInfo(uri)!;
      await addRepoFile(
        repository.name,
        repository.branch,
        filePath,
        // @ts-ignore
        content.toString("base64")
      );

      this._onDidChangeFile.fire([
        { type: vscode.FileChangeType.Created, uri }
      ]);
    } else {
      await updateRepoFile(
        repository.name,
        repository.branch,
        file!.path,
        content,
        file!.sha
      );

      this._onDidChangeFile.fire([
        { type: vscode.FileChangeType.Changed, uri }
      ]);
    }
  }

  async delete(uri: vscode.Uri): Promise<void> {
    const [repository, file] = RepoFileSystemProvider.getRepoInfo(uri)!;

    await deleteRepoFile(repository, file!);

    this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Deleted, uri }]);
  }

  async rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean }
  ): Promise<void> {
    const [repository, file] = RepoFileSystemProvider.getRepoInfo(oldUri)!;
    const [, newPath] = RepoFileSystemProvider.getFileInfo(newUri)!;

    renameFile(repository, file!, newPath);

    this._onDidChangeFile.fire([
      { type: vscode.FileChangeType.Deleted, uri: oldUri },
      { type: vscode.FileChangeType.Created, uri: newUri }
    ]);
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
    if (uri.path === "/") {
      const [repository] = RepoFileSystemProvider.getRepoInfo(uri)!;
      return repository.files!.map((file) => [
        file.name,
        file.isDirectory ? vscode.FileType.Directory : vscode.FileType.File
      ]);
    }

    return [];
  }

  createDirectory(uri: vscode.Uri): void {
    // When performing a file rename, VS Code
    // may attempt to create parent directories
    // for the target file. So simply allow this
    // operation to no-op, since Git doesn't
    // actually have the concept of directories.
  }

  watch(_resource: vscode.Uri): vscode.Disposable {
    return { dispose: () => {} };
  }
}

export function registerRepoFileSystemProvider() {
  vscode.workspace.registerFileSystemProvider(
    REPO_SCHEME,
    new RepoFileSystemProvider()
  );
}
