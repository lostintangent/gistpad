import * as vscode from "vscode";
import { registerCommands } from "./commands";
import { registerCommentController } from "./comments";
import * as config from "./config";
import { registerFileSystemProvider } from "./fileSystem";
import { registerRepoModule } from "./repos";
import { extendMarkdownIt } from "./repos/wiki/markdownPreview";
import { registerShowcaseModule } from "./showcase";
import { store } from "./store";
import { initializeAuth } from "./store/auth";
import { initializeStorage } from "./store/storage";
import { registerCodeSwingModule } from "./swings";
import { Trace } from "./tracing";
import { registerTreeProvider } from "./tree";
import { registerProtocolHandler } from "./uriHandler";

export let tracing: Trace;

export async function activate(context: vscode.ExtensionContext) {
  registerCommands(context);
  registerProtocolHandler();
  registerFileSystemProvider(store);
  registerTreeProvider(store, context);
  registerCommentController();

  initializeStorage(context);
  initializeAuth();

  registerRepoModule(context);
  registerCodeSwingModule(context);
  registerShowcaseModule(context);

  const keysForSync = ["followedUsers", "repos"].map((key) => `gistpad.${key}`);
  if (config.get("tracing.enableOutputChannel")) {
    tracing = new Trace();
  }

  tracing?.appendLine(
    `Setting keysForSync = ${keysForSync}`,
    tracing.messageType.Info
  );

  context.globalState.setKeysForSync(keysForSync);

  return {
    extendMarkdownIt
  };
}
