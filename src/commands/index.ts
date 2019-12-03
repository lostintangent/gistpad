import { ExtensionContext } from "vscode";
import { registerAuthCommands } from "./auth";
import { registerEditorCommands } from "./editor";
import { registerFileCommands } from "./file";
import { registerFollowCommands } from "./follow";
import { registerGistCommands } from "./gist";
import { registerPasteImageCommands } from "./pasteImage";

export function registerCommands(context: ExtensionContext) {
  registerAuthCommands(context);
  registerEditorCommands(context);
  registerFollowCommands(context);
  registerGistCommands(context);
  registerFileCommands(context);
  registerPasteImageCommands(context);
}
