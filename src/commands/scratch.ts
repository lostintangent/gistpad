import { commands, ExtensionContext, window } from "vscode";
import * as config from "../config";
import { EXTENSION_NAME } from "../constants";
import { store } from "../store";
import { clearScratchNotes, newScratchNote } from "../store/actions";

export async function registerScratchCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.newScratchNote`, newScratchNote)
  );

  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.hideScratchNotes`, () => {
      store.scratchNotes.show = false;
      config.set("scratchNotes.show", false);
    })
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
