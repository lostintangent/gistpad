import { ExtensionContext } from "vscode";
import { registerAuthCommands } from "./auth";
import { registerCommentCommands } from "./comments";
import { registerDirectoryCommands } from "./directory";
import { registerEditorCommands } from "./editor";
import { registerFileCommands } from "./file";
import { registerFollowCommands } from "./follow";
import { registerGistCommands } from "./gist";
import { registerGistLogCommands } from "./gistLog";
import { registerScratchCommands } from "./scratch";
import { registerTourCommands } from "./tour";

export function registerCommands(context: ExtensionContext) {
  registerAuthCommands(context);
  registerCommentCommands(context);
  registerEditorCommands(context);
  registerFollowCommands(context);
  registerGistCommands(context);
  registerGistLogCommands(context);
  registerFileCommands(context);
  registerDirectoryCommands(context);
  registerTourCommands(context);
  registerScratchCommands(context);
}
