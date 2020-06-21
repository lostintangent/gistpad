import * as vscode from "vscode";
import { stringToByteArray } from "../utils";
import { Repository, store, TreeItem } from "./store";
import {
  deleteRepoFile,
  getRepoFile,
  renameFile,
  updateRepoFile
} from "./store/actions";

export class RepoFileSystemProvider implements vscode.FileSystemProvider {
  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this
    ._emitter.event;

  static SCHEME = "repo";
  static URL_PATTERN = /\/([^\/]+\/[^\/]+)(?:\/(.+))?/i;

  static getFileInfo(uri: vscode.Uri): [string, string] | undefined {
    const match = RepoFileSystemProvider.URL_PATTERN.exec(uri.path)!;
    return match ? [match[1], match[2]] : undefined;
  }

  static getRepoInfo(
    uri: vscode.Uri
  ): [Repository, TreeItem | undefined] | undefined {
    const match = RepoFileSystemProvider.getFileInfo(uri);

    if (!match) {
      return;
    }

    const repository = store.repos.find((repo) => repo.name === match[0])!;
    const file = match[1]
      ? repository!.tree!.tree.find((file) => file.path === match[1])
      : undefined;

    return [repository, file];
  }

  static getFileUri(repo: string, filePath: string) {
    return vscode.Uri.parse(
      `${RepoFileSystemProvider.SCHEME}:/${repo}/${filePath}`
    );
  }

  stat(uri: vscode.Uri): vscode.FileStat {
    const fileInfo = RepoFileSystemProvider.getRepoInfo(uri);

    if (fileInfo && fileInfo[1]) {
      return {
        type: vscode.FileType.File,
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

    const contents = await getRepoFile(
      repository.name,
      repository.branch,
      file!.sha
    );

    return stringToByteArray(contents);
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    const [repository, file] = RepoFileSystemProvider.getRepoInfo(uri)!;

    await updateRepoFile(
      repository.name,
      repository.branch,
      file!.path,
      content,
      file!.sha
    );
  }

  async delete(uri: vscode.Uri): Promise<void> {
    const [repository, file] = RepoFileSystemProvider.getRepoInfo(uri)!;

    return deleteRepoFile(repository, file!);
  }

  async rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean }
  ): Promise<void> {
    const [repository, file] = RepoFileSystemProvider.getRepoInfo(oldUri)!;
    const [, newPath] = RepoFileSystemProvider.getFileInfo(newUri)!;

    return renameFile(repository, file!, newPath);
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
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
    RepoFileSystemProvider.SCHEME,
    new RepoFileSystemProvider()
  );
}
