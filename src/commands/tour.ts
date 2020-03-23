import * as path from "path";
import * as vscode from "vscode";
import { EXTENSION_NAME } from "../constants";
import { startTour, TOUR_FILE } from "../playgrounds/tour";
import { store } from "../store";
import { fileNameToUri, stringToByteArray, withProgress } from "../utils";

export async function registerTourCommands(context: vscode.ExtensionContext) {
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

          // TODO: Allow adding tours to gist directories
          // in order to support recording a tour for a tutorial step
          const tourUri = fileNameToUri(gist.id, TOUR_FILE);

          const tourContent = JSON.stringify(tour, null, 2);
          await vscode.workspace.fs.writeFile(
            tourUri,
            stringToByteArray(tourContent)
          );

          const workspaceRoot = vscode.Uri.parse(
            path.dirname(tourUri.toString())
          );
          startTour(tour, workspaceRoot, true);
        })
    )
  );
}
