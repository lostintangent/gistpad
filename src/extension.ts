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
let autoSaveManager: AutoSaveManager | undefined;

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

  // Only initialize GistPad auto-save if VS Code's auto-save is disabled
  const vscodeAutoSave = vscode.workspace.getConfiguration("files").get("autoSave");
  if (vscodeAutoSave === "off") {
    autoSaveManager = new AutoSaveManager();
    context.subscriptions.push(autoSaveManager);
  }

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
      
      // Handle VS Code auto-save configuration changes
      if (e.affectsConfiguration("files.autoSave")) {
        const vscodeAutoSave = vscode.workspace.getConfiguration("files").get("autoSave");
        
        if (vscodeAutoSave === "off" && !autoSaveManager) {
          // VS Code auto-save was disabled, initialize GistPad auto-save
          autoSaveManager = new AutoSaveManager();
          context.subscriptions.push(autoSaveManager);
        } else if (vscodeAutoSave !== "off" && autoSaveManager) {
          // VS Code auto-save was enabled, dispose GistPad auto-save
          autoSaveManager.dispose();
          autoSaveManager = undefined as any;
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
