import { ExtensionContext } from "vscode";
import { registerCommands } from "./commands";
import { registerFileSystemProvider } from "./fileSystem";
import { store } from "./store";
import { initializeAuth } from "./store/auth";
import { registerTreeProvider } from "./tree";

export function activate(context: ExtensionContext) {
  registerCommands(context);
  registerFileSystemProvider(store);
  registerTreeProvider(store, context.extensionPath);

  initializeAuth();
}
