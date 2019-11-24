import { ExtensionContext } from "vscode";
import { registerCommands } from "./commands";
import { registerFileSystemProvider } from "./fileSystemProvider";

export function activate(context: ExtensionContext) {
	registerFileSystemProvider();
	registerCommands(context);
}