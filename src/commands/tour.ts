import * as path from "path";
import * as vscode from "vscode";
import { EXTENSION_NAME } from "../constants";
import { exportTour, startTour, TOUR_FILE } from "../playgrounds/tour";
import { store } from "../store";
import { storage } from "../store/storage";
import {
  decodeDirectoryUri,
  fileNameToUri,
  stringToByteArray,
  withProgress
} from "../utils";
import { promptForGistSelection } from "./editor";
import { setActivePlaygroundHasTour } from "./playground";

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

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.recordCodeTour`,
      async () =>
        withProgress("Starting recorder...", async () => {
          const gist = store.activeGist!;

          const tour = {
            title: gist.description,
            description: gist.description,
            steps: []
          };

          let tourFile = TOUR_FILE;
          if (gist.type === "tutorial") {
            const stepNumber = storage.currentTutorialStep(gist.id);
            const pattern = new RegExp(`^#?${stepNumber}[^\/]*---`);
            const file = Object.keys(gist.files).find((file) =>
              file.match(pattern)
            );

            if (file) {
              const directory = file.match(pattern)![0];
              tourFile = `${directory}${TOUR_FILE}`;
            }
          }

          const tourUri = decodeDirectoryUri(fileNameToUri(gist.id, tourFile));
          const tourContent = JSON.stringify(tour, null, 2);
          await vscode.workspace.fs.writeFile(
            tourUri,
            stringToByteArray(tourContent)
          );

          const workspaceRoot = vscode.Uri.parse(
            path.dirname(tourUri.toString())
          );

          startTour(tour, workspaceRoot, true);
          setActivePlaygroundHasTour();
        })
    )
  );
}
