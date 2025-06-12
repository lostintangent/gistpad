import * as vscode from "vscode";
import { workspace } from "vscode";
import { AutoSaveManager } from "./autoSave";
import { registerCommands } from "./commands";
import { registerCommentController } from "./comments";
import * as config from "./config";
import { registerFileSystemProvider } from "./fileSystem";
import { registerMcpServerDefinitionProvider } from "./mcp";
import { Output } from "./output";
import { registerRepoModule } from "./repos";
import { extendMarkdownIt } from "./repos/wiki/markdownPreview";
import { registerShowcaseModule } from "./showcase";
import { store } from "./store";
import { initializeAuth } from "./store/auth";
import { initializeStorage } from "./store/storage";
import { registerCodeSwingModule } from "./swings";
import { registerTreeProvider } from "./tree";
import { registerProtocolHandler } from "./uriHandler";

export let output: Output;
let autoSaveManager: AutoSaveManager;

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

  autoSaveManager = new AutoSaveManager();
  context.subscriptions.push(autoSaveManager);

  const keysForSync = ["followedUsers", "repos"].map((key) => `gistpad.${key}`);
  if (config.get("output")) {
    output = new Output();
  }

  output?.appendLine(
    `Setting keysForSync = ${keysForSync}`,
    output.messageType.Info
  );

  context.subscriptions.push(
    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("gistpad.output")) {
        if (config.get("output")) {
          output = new Output();
        } else {
          output.dispose();
        }
      }
    })
  );

  context.globalState.setKeysForSync(keysForSync);

  registerMcpServerDefinitionProvider(context);

  return {
    extendMarkdownIt
  };
}
