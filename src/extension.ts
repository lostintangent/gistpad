import { ExtensionContext } from "vscode";
import { initializeAuth } from "./auth";
import { registerCommands } from "./commands";
import { registerFileSystemProvider } from "./fileSystemProvider";
import { store } from "./store";
import { registerTreeProvider } from "./tree/treeProvider";

export function activate(context: ExtensionContext) {
	registerFileSystemProvider();
	registerCommands(context);
	registerTreeProvider(store, context.extensionPath);

	initializeAuth();
}