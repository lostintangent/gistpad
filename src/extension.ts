import * as vscode from "vscode";
import { registerCommands } from "./commands";
import { registerFileSystemProvider } from "./fileSystem";
import { log } from "./logger";
import { store } from "./store";
import { initializeAuth } from "./store/auth";
import { initializeStorage } from "./store/storage";
import { registerTreeProvider } from "./tree";


export async function activate(context: vscode.ExtensionContext) {
  try {
    log.setLoggingChannel(vscode.window.createOutputChannel('GitPad'));

    registerCommands(context);
    registerFileSystemProvider(store);

    registerTreeProvider(store, context.extensionPath);

    initializeStorage(context);
    initializeAuth();
  } catch (e) {
    log.error(e);
    vscode.window.showErrorMessage(e);
  }
}