import { reaction } from "mobx";
import * as vscode from "vscode";
import { extensions } from "vscode";
import { EXTENSION_NAME, SWING_FILE } from "../constants";
import { Gist, store } from "../store";
import { newGist } from "../store/actions";
import { GistNode } from "../tree/nodes";
import { fileNameToUri, isOwnedGist, updateGistTags } from "../utils";

class CodeSwingTemplateProvider {
  public _onDidChangeTemplate = new vscode.EventEmitter<void>();
  public onDidChangeTemplates = this._onDidChangeTemplate.event;

  public provideTemplates() {
    return store.gists
      .concat(store.starredGists)
      .filter((gist: Gist) => gist.type === "code-swing-template")
      .map((gist: Gist) => ({
        title: gist.description,
        description: isOwnedGist(gist.id) ? "" : gist.owner,
        files: Object.keys(gist.files).map((file) => ({
          filename: file,
          content: gist.files[file].content
        }))
      }));
  }
}

const templateProvider = new CodeSwingTemplateProvider();

function loadSwingManifests() {
  store.gists.concat(store.starredGists).forEach(async (gist) => {
    const manifest = gist.files[SWING_FILE];
    if (manifest) {
      await vscode.workspace.fs.readFile(fileNameToUri(gist.id, SWING_FILE));
      updateGistTags(gist);
    }
  });

  templateProvider._onDidChangeTemplate.fire();
}

async function newSwing(isPublic: boolean) {
  const inputBox = vscode.window.createInputBox();
  inputBox.title = "Create new " + (isPublic ? "" : "secret ") + "swing";
  inputBox.placeholder = "Specify the description of the swing";

  inputBox.onDidAccept(() => {
    inputBox.hide();

    swingApi.newSwing(
      async (files: { filename: string; contents?: string }[]) => {
        const gist = await newGist(files, isPublic, inputBox.value, false);
        return fileNameToUri(gist.id);
      },
      inputBox.title
    );
  });

  inputBox.show();
}

let swingApi: any;
export async function registerCodeSwingModule(
  context: vscode.ExtensionContext
) {
  reaction(
    () => [store.isSignedIn, store.isLoading],
    ([isSignedIn, isLoading]) => {
      if (isSignedIn && !isLoading) {
        loadSwingManifests();
      }
    }
  );

  const extension = extensions.getExtension("codespaces-contrib.codeswing");
  if (!extension) {
    return;
  }

  vscode.commands.executeCommand(
    "setContext",
    "gistpad:codeSwingEnabled",
    true
  );

  if (!extension.isActive) {
    await extension.activate();
  }

  swingApi = extension.exports;

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.newSwing`,
      newSwing.bind(null, true)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.newSecretSwing`,
      newSwing.bind(null, false)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.openGistInBlocks`,
      async (node: GistNode) => {
        vscode.env.openExternal(
          vscode.Uri.parse(
            `https://bl.ocks.org/${node.gist.owner.login}/${node.gist.id}`
          )
        );
      }
    )
  );

  swingApi.registerTemplateProvider("gist", templateProvider, {
    title: "Gists",
    description:
      "Templates provided by your own gists, and gists you've starred."
  });
}
