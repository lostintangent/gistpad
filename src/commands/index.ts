import { ExtensionContext } from "vscode";
import { registerAuthCommands } from "./auth";
import { registerCommentCommands } from "./comments";
import { registerDirectoryCommands } from "./directory";
import { registerEditorCommands } from "./editor";
import { registerFileCommands } from "./file";
import { registerFollowCommands } from "./follow";
import { registerGistCommands } from "./gist";
import { registerGistLogCommands } from "./gistLog";
import { registerNotebookCommands } from "./notebook";
import { registerScratchCommands } from "./scratch";
import { registerTourCommands } from "./tour";

export function registerCommands(context: ExtensionContext) {
  registerAuthCommands(context);
  registerCommentCommands(context);
  registerDirectoryCommands(context);
  registerEditorCommands(context);
  registerFileCommands(context);
  registerFollowCommands(context);
  registerGistCommands(context);
  registerGistLogCommands(context);
  registerNotebookCommands(context);
  registerScratchCommands(context);
  registerTourCommands(context);
}
