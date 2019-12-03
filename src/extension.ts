import * as vscode from "vscode";
import { registerCommands } from "./commands";
import { registerFileSystemProvider } from "./fileSystem";
import { store } from "./store";
import { initializeAuth } from "./store/auth";
import { initializeStorage } from "./store/storage";
import { registerTreeProvider } from "./tree";

export function activate(context: vscode.ExtensionContext) {
  registerCommands(context);
  registerFileSystemProvider(store);
  registerTreeProvider(store, context.extensionPath);

  initializeStorage(context);
  initializeAuth();
}