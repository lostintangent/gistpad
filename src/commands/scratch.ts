import { commands, ExtensionContext, window } from "vscode";
import { EXTENSION_NAME } from "../constants";
import {
  clearScratchNotes,
  deleteScratchNote,
  newScratchNote
} from "../store/actions";
import { ScratchGistFileNode } from "../tree/nodes";
import { withProgress } from "../utils";

export async function registerScratchCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.newScratchNote`, () =>
      withProgress("Creating scratch note...", newScratchNote)
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.deleteScratchNote`,
      (node: ScratchGistFileNode) => {
        withProgress("Deletign scratch note...", () =>
          deleteScratchNote(node.file.filename!)
        );
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.clearScratchNotes`,
      async () => {
        const response = await window.showInformationMessage(
          "Are you sure you want to clear your scratch notes?",
          "Clear Notes"
        );

        if (response) {
          clearScratchNotes();
        }
      }
    )
  );
}
