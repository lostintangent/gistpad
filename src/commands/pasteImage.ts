import { pasteImageCommand } from '@abstractions/commands/pasteImage';
import { commands, ExtensionContext } from "vscode";
import { EXTENSION_ID } from "../constants";

export async function registerPasteImageCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_ID}.pasteScreenshot`, pasteImageCommand)
  );
}
