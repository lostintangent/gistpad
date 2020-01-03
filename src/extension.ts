import * as vscode from "vscode";
import { registerCommands } from "./commands";
import { registerCommentController } from "./comments";
import { registerFileSystemProvider } from "./fileSystem";
import { log } from "./logger";
import { initializeMemento } from "./memento";
import { initializeProtocolHander } from "./protocolHandler";
import { store } from "./store";
import { initializeAuth } from "./store/auth";
import { initializeStorage } from "./store/storage";
import { registerTreeProvider } from "./tree";
import { getGistWorkspaceId, isGistWorkspace, openGistFiles } from "./utils";

export async function activate(context: vscode.ExtensionContext) {
  log.setLoggingChannel(vscode.window.createOutputChannel("GistPad"));

  initializeMemento(context);

  initializeProtocolHander();
  registerFileSystemProvider(store);
  registerCommands(context);
  registerTreeProvider(store, context.extensionPath);
  registerCommentController();

  if (isGistWorkspace()) {
    const gistId = getGistWorkspaceId();
    openGistFiles(gistId);
  }

  initializeStorage(context);
  initializeAuth();
}
