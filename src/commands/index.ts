import * as vscode from "vscode";
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
import { registerTourCommands } from "./tour";

// https://github.com/patriksimek/vm2/issues/70#issuecomment-297601837
const { NodeVM } = eval("require")("vm2");

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
  registerTourCommands(context);
  registerScratchCommands(context);

  vscode.commands.registerCommand("gistpad.runInlineEval", async (code) => {
    const vm = new NodeVM({
      require: {
        external: true,
        builtin: ["*"]
      },
      wrapper: "none"
    });
    let result = vm.run(code);
    await vscode.window.showInformationMessage(result);
  });
}
