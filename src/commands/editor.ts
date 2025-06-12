import { pasteImageCommand } from "@abstractions/images/pasteImage";
import * as path from "path";
import {
  commands,
  ExtensionContext,
  ProgressLocation,
  TextEditor,
  Uri,
  window,
  workspace
} from "vscode";
import { EXTENSION_NAME } from "../constants";
import { GistFile, store } from "../store";
import { newGist } from "../store/actions";
import { ensureAuthenticated } from "../store/auth";
import { GistFileNode } from "../tree/nodes";
import {
  byteArrayToString,
  decodeDirectoryName,
  fileNameToUri,
  getGistDescription,
  getGistLabel,
  stringToByteArray
} from "../utils";
import { GistQuickPickItem } from "./gist";

async function askForFileName() {
  return window.showInputBox({
    prompt: "Enter a name to give to this file",
    placeHolder: "foo.txt"
  });
}

const CREATE_PUBLIC_GIST_ITEM = "$(gist-new) Create new public Gist...";
const CREATE_SECRET_GIST_ITEM = "$(gist-private) Create new secret Gist...";
const CREATE_GIST_ITEMS = [
  { label: CREATE_PUBLIC_GIST_ITEM, alwaysShow: true },
  { label: CREATE_SECRET_GIST_ITEM, alwaysShow: true }
];

async function newGistWithFiles(isPublic: boolean, files: GistFile[]) {
  const description = await window.showInputBox({
    prompt: "Enter an optional description for the new Gist"
  });

  window.withProgress(
    { location: ProgressLocation.Notification, title: "Creating Gist..." },
    () => {
      return newGist(files, isPublic, description, false);
    }
  );
}

export async function promptForGistSelection(files: GistFile[]) {
  const gistItems = store.gists.map((gist) => {
    return <GistQuickPickItem>{
      label: getGistLabel(gist),
      description: getGistDescription(gist),
      id: gist.id
    };
  });

  gistItems.unshift(...CREATE_GIST_ITEMS);

  const list = window.createQuickPick();
  list.placeholder = "Specify the gist you'd like to add the file(s) to";
  list.items = gistItems;

  list.onDidAccept(async () => {
    const gist = <GistQuickPickItem>list.selectedItems[0];

    list.hide();

    if (gist.id) {
      window.withProgress(
        { location: ProgressLocation.Notification, title: "Adding file(s)..." },
        () =>
          Promise.all(
            files.map((file) =>
              workspace.fs.writeFile(
                fileNameToUri(gist.id!, file.filename!),
                stringToByteArray(file.content!)
              )
            )
          )
      );
    } else {
      const isPublic = gist.label === CREATE_PUBLIC_GIST_ITEM;
      newGistWithFiles(isPublic, files);
    }
  });

  list.show();
}

export function registerEditorCommands(context: ExtensionContext) {
  // This command can be called from five different contexts:
  // 1) Right-clicking a file in the "Explorer" tree (Uri)
  // 2) Right-clicking the editor tab of a file (Uri)
  // 3) Right-clicking a file in the "Gists" tree (GistFileNode)
  // 4) From the toolbar of the notebook editor
  // 5) From the command palette (no parameters - use active editor)
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.addFileToGist`,
      async (
        targetNode?: GistFileNode | Uri | { notebookEditor: { notebookUri: Uri }},
        multiSelectNodes?: GistFileNode[] | Uri[]
      ) => {
        await ensureAuthenticated();

        // If no parameters are passed (called from command palette),
        // use the active text editor
        if (!targetNode) {
          const activeEditor = window.activeTextEditor;
          if (!activeEditor) {
            window.showErrorMessage("No active editor found. Please open a file first.");
            return;
          }
          targetNode = activeEditor.document.uri;
        }

        const nodes =
          multiSelectNodes && !("editorIndex" in multiSelectNodes)
            ? multiSelectNodes
            : [targetNode];

        const files = [];

        for (const node of nodes) {
          if (node instanceof GistFileNode) {
            // The command is being called as a response to
            // right-clicking a file node in the Gists tree
            files.push({
              filename: node.file.filename!,
              content: byteArrayToString(
                await workspace.fs.readFile(
                  fileNameToUri(node.gistId, node.file.filename!)
                )
              )
            });
          } else {
            const uri = node instanceof Uri ? node : node.notebookEditor.notebookUri;
            
            // The command is being called as a response to
            // right-clicking a file node in the explorer
            // and/or right-clicking the editor tab
            files.push({
              filename: path.basename(uri.path),
              content: byteArrayToString(await workspace.fs.readFile(uri))
            });
          }
        }

        promptForGistSelection(files);
      }
    )
  );

  context.subscriptions.push(
    commands.registerTextEditorCommand(
      `${EXTENSION_NAME}.addSelectionToGist`,
      async (editor: TextEditor) => {
        await ensureAuthenticated();

        const filename = await askForFileName();
        if (!filename) {
          return;
        }

        const content = await editor.document.getText(editor.selection);
        promptForGistSelection([{ filename, content }]);
      }
    )
  );

  context.subscriptions.push(
    commands.registerTextEditorCommand(
      `${EXTENSION_NAME}.pasteGistFile`,
      async (editor: TextEditor) => {
        await ensureAuthenticated();

        const gists = store.gists;
        const gistItems = store.gists.map((gist) => ({
          label: getGistLabel(gist),
          description: getGistDescription(gist),
          id: gist.id
        }));

        const selectedGist = await window.showQuickPick(gistItems, {
          placeHolder: "Select the Gist you'd like to paste a file from"
        });
        if (!selectedGist) {
          return;
        }

        const gist = gists.find((gist) => gist.id === selectedGist!.id);

        const fileItems = Object.keys(gist!.files).map(decodeDirectoryName);

        let selectedFile: string | undefined;
        if (fileItems.length === 1) {
          selectedFile = fileItems[0];
        } else {
          selectedFile = await window.showQuickPick(fileItems, {
            placeHolder: "Select the file to paste from"
          });
          if (!selectedFile) {
            return;
          }
        }

        // TODO: Add support for pasting binary files
        // (or at least prevent it)
        const uri = fileNameToUri(gist!.id, selectedFile);
        const contents = byteArrayToString(await workspace.fs.readFile(uri));

        editor.edit((editBuilder) => {
          editBuilder.insert(editor.selection.active, contents);
        });
      }
    )
  );

  context.subscriptions.push(
    commands.registerTextEditorCommand(
      `${EXTENSION_NAME}.pasteImage`,
      pasteImageCommand
    )
  );
}
