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
import { listGists, newGist } from "../store/actions";
import { ensureAuthenticated } from "../store/auth";
import { fileNameToUri, getGistLabel } from "../utils";
import { GistQuickPickItem } from "./gist";

async function askForFileName() {
  return window.showInputBox({
    prompt: "Enter a name to give to this file",
    value: "foo.txt"
  });
}

const CREATE_PUBLIC_GIST_ITEM = "$(gist-new) Create new Gist...";
const CREATE_SECRET_GIST_ITEM = "$(gist-private) Create new secret Gist...";
const CREATE_GIST_ITEMS = [
  { label: CREATE_PUBLIC_GIST_ITEM },
  { label: CREATE_SECRET_GIST_ITEM }
];

async function newGistWithFile(
  isPublic: boolean,
  filename: string,
  content: string
) {
  const description = await window.showInputBox({
    prompt: "Enter an optional description for the new Gist"
  });

  window.withProgress(
    { location: ProgressLocation.Notification, title: "Creating Gist..." },
    () => {
      return newGist(
        [
          {
            filename,
            content
          }
        ],
        isPublic,
        description,
        false
      );
    }
  );
}

async function promptForGistSelection(filename: string, contents: string) {
  const gists = await listGists();
  const gistItems = gists.map(gist => {
    return <GistQuickPickItem>{
      label: getGistLabel(gist),
      description: gist.public ? "" : "Secret",
      id: gist.id
    };
  });

  gistItems.push(...CREATE_GIST_ITEMS);

  const list = window.createQuickPick();
  list.placeholder = "Specify the Gist you'd like to add this file to";
  list.items = gistItems;

  list.onDidAccept(async () => {
    const gist = <GistQuickPickItem>list.selectedItems[0];

    list.hide();

    if (gist.id) {
      window.withProgress(
        { location: ProgressLocation.Notification, title: "Adding files..." },
        () => {
          return workspace.fs.writeFile(
            fileNameToUri(gist.id!, filename!),
            Buffer.from(contents!)
          );
        }
      );
    } else {
      const isPublic = gist.label === CREATE_PUBLIC_GIST_ITEM;
      newGistWithFile(isPublic, filename, contents);
    }
  });

  list.show();
}

export function registerEditorCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.addFileToGist`,
      async (fileUri: Uri) => {
        await ensureAuthenticated();

        let filename: string | undefined;
        let contents: string | undefined;
        if (fileUri.scheme === UNTITLED_SCHEME) {
          filename = await askForFileName();
          if (!filename) {
            return;
          }

          contents = await window.activeTextEditor!.document.getText();
        } else {
          filename = path.basename(fileUri.toString());
          contents = (await workspace.fs.readFile(fileUri)).toString();
        }

        promptForGistSelection(filename, contents);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.addSelectionToGist`,
      async (fileUri: Uri) => {
        await ensureAuthenticated();

        const filename = await askForFileName();
        if (!filename) {
          return;
        }

        const contents = await window.activeTextEditor!.document.getText(
          window.activeTextEditor!.selection
        );

        promptForGistSelection(filename, contents);
      }
    )
  );
}
