import * as path from "path";
import * as vscode from "vscode";
import { INPUT_SCHEME } from "../constants";
import { byteArrayToString, stringToByteArray } from "../utils";

export class InputFileSystemProvider implements vscode.FileSystemProvider {
  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this
    ._emitter.event;

  private files = new Map();

  stat(uri: vscode.Uri): vscode.FileStat {
    return {
      type: vscode.FileType.File,
      ctime: Date.now(),
      mtime: Date.now(),
      size: 100
    };
  }

  readFile(uri: vscode.Uri): Uint8Array {
    const inputName = path.basename(uri.path);
    const input = this.files.get(inputName);
    return stringToByteArray(input);
  }

  writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): void {
    const inputName = path.basename(uri.path);
    this.files.set(inputName, byteArrayToString(content));
  }

  delete(uri: vscode.Uri): void {
    const inputName = path.basename(uri.path);
    this.files.delete(inputName);
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
    throw vscode.FileSystemError.NoPermissions("Not supported");
  }

  rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean }
  ): void {
    throw vscode.FileSystemError.NoPermissions("Not supported");
  }

  createDirectory(uri: vscode.Uri): void {
    throw vscode.FileSystemError.NoPermissions("Not supported");
  }

  watch(_resource: vscode.Uri): vscode.Disposable {
    return { dispose: () => {} };
  }
}

export function registerInputFileSystemProvider() {
  vscode.workspace.registerFileSystemProvider(
    INPUT_SCHEME,
    new InputFileSystemProvider()
  );
}
