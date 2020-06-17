import * as vscode from "vscode";
import { stringToByteArray } from "../utils";
import { Repository, store, TreeItem } from "./store";
import { getRepoFile, updateRepoFile } from "./store/actions";

export class RepoFileSystemProvider implements vscode.FileSystemProvider {
  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this
    ._emitter.event;

  static URL_PATTERN = /\/([^\/]+\/[^\/]+)\/(.+)/i;

  static getFileInfo(uri: vscode.Uri) {
    const match = RepoFileSystemProvider.URL_PATTERN.exec(uri.path)!;
    return [match[1], match[2]];
  }

  static getRepoInfo(uri: vscode.Uri): [Repository, TreeItem] {
    const match = RepoFileSystemProvider.getFileInfo(uri);

    const repository = store.repos.find((repo) => repo.name === match![0])!;
    const file = repository!.tree!.tree.find(
      (file) => file.path === match![1]
    )!;

    return [repository, file];
  }

  stat(uri: vscode.Uri): vscode.FileStat {
    return {
      type: vscode.FileType.File,
      ctime: Date.now(),
      mtime: Date.now(),
      size: 100
    };
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const [repository, file] = RepoFileSystemProvider.getRepoInfo(uri);

    const contents = await getRepoFile(repository.name, file.sha);
    return stringToByteArray(contents);
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    const [repository, file] = RepoFileSystemProvider.getRepoInfo(uri);

    await updateRepoFile(repository.name, file.path, content, file.sha);
  }

  delete(uri: vscode.Uri): void {
    throw vscode.FileSystemError.NoPermissions("Not supported");
  }

  rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean }
  ): void {
    throw vscode.FileSystemError.NoPermissions("Not supported");
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
    throw vscode.FileSystemError.NoPermissions("Not supported");
  }

  createDirectory(uri: vscode.Uri): void {
    throw vscode.FileSystemError.NoPermissions("Not supported");
  }

  watch(_resource: vscode.Uri): vscode.Disposable {
    return { dispose: () => {} };
  }
}

export function registerRepoFileSystemProvider() {
  vscode.workspace.registerFileSystemProvider(
    "repo",
    new RepoFileSystemProvider()
  );
}
