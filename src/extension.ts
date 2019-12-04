import { ExtensionContext } from "vscode";
import { registerCommands } from "./commands";
import { registerCommentController } from "./comments";
import { registerFileSystemProvider } from "./fileSystem";
import { store } from "./store";
import { initializeAuth } from "./store/auth";
import { initializeStorage } from "./store/storage";
import { registerTreeProvider } from "./tree";

export function activate(context: ExtensionContext) {
  registerCommands(context);
  registerFileSystemProvider(store);
  registerTreeProvider(store, context.extensionPath);
  registerCommentController();

  initializeStorage(context);
  initializeAuth();
}
