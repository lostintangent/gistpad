import * as vscode from "vscode";
import { registerCommands } from "./commands";
import { registerCommentController } from "./comments";
import { registerFileSystemProvider } from "./fileSystem";
import { log } from "./logger";
import { registerPlaygroundContentProvider } from "./playgrounds/contentProvider";
import { store } from "./store";
import { initializeAuth } from "./store/auth";
import { initializeStorage } from "./store/storage";
import { registerTreeProvider } from "./tree";
import { registerProtocolHander } from "./uriHandler";
import { getGistWorkspaceId, isGistWorkspace, openGistFiles } from "./utils";

export async function activate(context: vscode.ExtensionContext) {
  log.setLoggingChannel(vscode.window.createOutputChannel("GistPad"));

  registerCommands(context);
  registerCommentController();
  registerFileSystemProvider(store);
  registerPlaygroundContentProvider();
  registerProtocolHander();
  registerTreeProvider(store, context.extensionPath);

  if (isGistWorkspace()) {
    const gistId = getGistWorkspaceId();
    openGistFiles(gistId);
  }

  initializeStorage(context);
  initializeAuth();
}
