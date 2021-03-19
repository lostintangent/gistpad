import * as vscode from "vscode";
import { registerCommands } from "./commands";
import { registerCommentController } from "./comments";
import { registerFileSystemProvider } from "./fileSystem";
import { registerRepoModule } from "./repos";
import { extendMarkdownIt } from "./repos/wiki/markdownPreview";
import { registerShowcaseModule } from "./showcase";
import { store } from "./store";
import { initializeAuth } from "./store/auth";
import { initializeStorage } from "./store/storage";
import { registerCodeSwingModule } from "./swings";
import { registerTreeProvider } from "./tree";
import { registerProtocolHander } from "./uriHandler";

export async function activate(context: vscode.ExtensionContext) {
  registerCommands(context);
  registerProtocolHander();
  registerFileSystemProvider(store);
  registerTreeProvider(store, context);
  registerCommentController();

  initializeStorage(context);
  initializeAuth();

  registerRepoModule(context);
  registerCodeSwingModule(context);
  registerShowcaseModule(context);

  const keysForSync = ["followedUsers", "repos"].map((key) => `gistpad.${key}`);
  context.globalState.setKeysForSync(keysForSync);

  return {
    extendMarkdownIt
  };
}
