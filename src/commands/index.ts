import { ExtensionContext } from "vscode";
import { registerAuthCommands } from "./auth";
import { registerCodePenCommands } from "./codepen";
import { registerCommentCommands } from "./comments";
import { registerEditorCommands } from "./editor";
import { registerFileCommands } from "./file";
import { registerFollowCommands } from "./follow";
import { registerGistCommands } from "./gist";
import { registerGistLogCommands } from "./gistLog";
import { registerPasteImageCommands } from "./pasteImage";
import { registerPlaygroundCommands } from "./playground";

export function registerCommands(context: ExtensionContext) {
  registerAuthCommands(context);
  registerCommentCommands(context);
  registerEditorCommands(context);
  registerFollowCommands(context);
  registerGistCommands(context);
  registerGistLogCommands(context);
  registerFileCommands(context);
  registerPasteImageCommands(context);
  registerPlaygroundCommands(context);
  registerCodePenCommands(context);
}
