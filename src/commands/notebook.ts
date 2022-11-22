import * as vscode from "vscode";
import { EXTENSION_NAME } from "../constants";
import { newGist } from "../store/actions";
import { fileNameToUri, openGistFile } from "../utils";

const NOTEBOOK_FILE = "index.ipynb";

async function newNotebook(description: string) {
  const files = [
    {
      filename: NOTEBOOK_FILE
    }
  ];

  const gist = await newGist(files, false, description, false);
  const notebookUri = fileNameToUri(gist.id, NOTEBOOK_FILE);
  openGistFile(notebookUri, false);
}

export async function registerNotebookCommands(
  context: vscode.ExtensionContext
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.newNotebook`,
      async () => {
        const description = await vscode.window.showInputBox({
          prompt: "Enter the description of the notebook"
        });

        if (!description) {
          return;
        }

        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Creating notebook..."
          },
          () => newNotebook(description)
        );
      }
    )
  );
}
