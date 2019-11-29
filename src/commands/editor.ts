import * as path from "path";
import {
  commands,
  ExtensionContext,
  ProgressLocation,
  Uri,
  window,
  workspace
} from "vscode";
import { EXTENSION_ID, UNTITLED_SCHEME } from "../constants";
import { listGists } from "../store/actions";
import { ensureAuthenticated } from "../store/auth";
import { fileNameToUri, getGistLabel } from "../utils";
import { GistQuickPickItem } from "./gist";

export function registerEditorCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.addFileToGist`,
      async (fileUri: Uri) => {
        await ensureAuthenticated();

        let filename: string | undefined;
        let contents: string | undefined;
        if (fileUri.scheme === UNTITLED_SCHEME) {
          filename = await window.showInputBox({
            prompt: "Enter a name to give to this file",
            value: "foo.txt"
          });

          if (!filename) {
            return;
          }

          contents = await window.activeTextEditor!.document.getText();
        } else {
          filename = path.basename(fileUri.toString());
          contents = (await workspace.fs.readFile(fileUri)).toString();
        }

        const gists = await listGists();

        let gistItems: GistQuickPickItem[];
        if (gists.length > 0) {
          gistItems = gists.map(gist => {
            return <GistQuickPickItem>{
              label: getGistLabel(gist),
              description: gist.description,
              id: gist.id
            };
          });
        } else {
          // TODO: Allow creating a Gist
          window.showInformationMessage("You don't have any Gists");
          return;
        }

        const selected = await window.showQuickPick(gistItems, {
          placeHolder: "Select the Gist you'd like to add this file to"
        });
        if (!selected) {
          return;
        }

        window.withProgress(
          { location: ProgressLocation.Notification, title: "Adding files..." },
          () => {
            return workspace.fs.writeFile(
              fileNameToUri(selected.id!, filename!),
              Buffer.from(contents!)
            );
          }
        );
      }
    )
  );
}
