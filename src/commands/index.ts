import { ExtensionContext } from "vscode";
import { registerAuthCommands } from "./auth";
import { registerCommentCommands } from "./comments";
import { registerDailyCommands } from "./daily";
import { registerDirectoryCommands } from "./directory";
import { registerEditorCommands } from "./editor";
import { registerFileCommands } from "./file";
import { registerFollowCommands } from "./follow";
import { registerGistCommands } from "./gist";
import { registerNotebookCommands } from "./notebook";
import { registerTourCommands } from "./tour";

export function registerCommands(context: ExtensionContext) {
  registerAuthCommands(context);
  registerCommentCommands(context);
  registerDirectoryCommands(context);
  registerEditorCommands(context);
  registerFileCommands(context);
  registerFollowCommands(context);
  registerGistCommands(context);
  registerNotebookCommands(context);
  registerDailyCommands(context);
  registerTourCommands(context);
}
