import { ExtensionContext } from "vscode";
import { registerAuthCommands } from "./auth";
import { registerEditorCommands } from "./editor";
import { registerFileCommands } from "./file";
import { registerGistCommands } from "./gist";

export function registerCommands(context: ExtensionContext) {
	registerAuthCommands(context);
	registerEditorCommands(context);
	registerGistCommands(context);
	registerFileCommands(context);
}