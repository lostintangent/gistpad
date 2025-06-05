import { commands, ExtensionContext, window } from "vscode";
import * as config from "../config";
import { EXTENSION_NAME } from "../constants";
import { store } from "../store";
import { clearDailyNotes, openDailyTemplate, openTodayNote } from "../store/actions";

export async function registerDailyCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.openTodayNote`, openTodayNote)
  );

  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.openDailyTemplate`, openDailyTemplate)
  );

  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.hideDailyNotes`, () => {
      store.dailyNotes.show = false;
      config.set("dailyNotes.show", false);
    })
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.clearDailyNotes`,
      async () => {
        const response = await window.showInformationMessage(
          "Are you sure you want to clear your daily notes?",
          "Clear Notes"
        );

        if (response) {
          clearDailyNotes();
        }
      }
    )
  );
}
