import { ExtensionContext } from "vscode";
import { registerAuthCommands } from "./auth";
import { registerCodePenCommands } from "./codepen";
import { registerCommentCommands } from "./comments";
import { registerDirectoryCommands } from "./directory";
import { registerEditorCommands } from "./editor";
import { registerFileCommands } from "./file";
import { registerFollowCommands } from "./follow";
import { registerGistCommands } from "./gist";
import { registerGistLogCommands } from "./gistLog";
import { registerPlaygroundCommands } from "./playground";
import { registerScratchCommands } from "./scratch";

export function registerCommands(context: ExtensionContext) {
  registerAuthCommands(context);
  registerCommentCommands(context);
  registerEditorCommands(context);
  registerFollowCommands(context);
  registerGistCommands(context);
  registerGistLogCommands(context);
  registerFileCommands(context);
  registerPlaygroundCommands(context);
  registerCodePenCommands(context);
  registerDirectoryCommands(context);
  registerScratchCommands(context);
}
