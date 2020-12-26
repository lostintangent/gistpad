import * as vscode from "vscode";
import { EXTENSION_NAME } from "../constants";
import { exportTour, TOUR_FILE } from "../tour";
import { promptForGistSelection } from "./editor";

export async function registerTourCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.exportTour`,
      async ({ tour }) => {
        const content = await exportTour(tour);
        promptForGistSelection([{ filename: TOUR_FILE, content }]);
      }
    )
  );
}
