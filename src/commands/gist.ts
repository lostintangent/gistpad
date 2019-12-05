import { commands, env, ExtensionContext, ProgressLocation, QuickPickItem, Uri, window } from "vscode";
import { EXTENSION_ID, FS_SCHEME } from "../constants";
import { changeDescription, deleteGist, forkGist, listGists, newGist, refreshGists, starredGists, unstarGist } from "../store/actions";
import { ensureAuthenticated, isAuthenticated, signIn } from "../store/auth";
import { GistNode, StarredGistNode } from "../tree/nodes";
import { getGistLabel, getGistWorkspaceId, getStarredGistLabel, isGistWorkspace, openGist, openGistAsWorkspace } from "../utils";

const GIST_URL_PATTERN = /https:\/\/gist\.github\.com\/(?<owner>[^\/]+)\/(?<id>.+)/;

export interface GistQuickPickItem extends QuickPickItem {
  id?: string;
}

const newPublicGist = newGistInternal.bind(null, true);
const newSecretGist = newGistInternal.bind(null, false);

async function newGistInternal(isPublic: boolean = true) {
  await ensureAuthenticated();

  const fileName = await window.showInputBox({
    prompt:
      "Enter the files name(s) to seed the Gist with (can be a comma-seperated list)",
    value: "foo.txt"
  });
  if (!fileName) {
    return;
  }

  const description = await window.showInputBox({
    prompt: "Enter an optional description for the new Gist"
  });

  window.withProgress(
    { location: ProgressLocation.Notification, title: "Creating Gist..." },
    () => {
      const files = fileName.split(",").map(filename => ({ filename }));
      return newGist(files, isPublic, description);
    }
  );
}

const SIGN_IN_ITEM = "Sign in to view Gists...";
const CREATE_PUBLIC_GIST_ITEM = "$(gist-new) Create new Gist...";
const CREATE_SECRET_GIST_ITEM = "$(gist-private) Create new secret Gist...";
const STARRED_GIST_ITEM = "$(star) View starred Gists...";
const CREATE_GIST_ITEMS = [
  { label: CREATE_PUBLIC_GIST_ITEM },
  { label: CREATE_SECRET_GIST_ITEM },
  { label: STARRED_GIST_ITEM }
];

async function openGistInternal(
  openAsWorkspace: boolean = false,
  node?: GistNode
) {
  let gistItems: GistQuickPickItem[] = [];

  if (node) {
    if (openAsWorkspace) {
      return openGistAsWorkspace(node.gist.id);
    } else {
      return openGist(node.gist.id, false);
    }
  }
  if (await isAuthenticated()) {
    const gists = await listGists();

    if (gists.length > 0) {
      gistItems = gists.map(gist => {
        return <GistQuickPickItem>{
          label: getGistLabel(gist),
          description: gist.description,
          id: gist.id
        };
      });
    }

    gistItems.push(...CREATE_GIST_ITEMS);
  } else {
    gistItems = [{ label: SIGN_IN_ITEM }];
  }

  const list = window.createQuickPick();
  list.placeholder = "Select or specify the Gist you'd like to open";
  list.items = gistItems;

  list.onDidChangeValue(gistId => {
    list.items = gistId
      ? [{ label: gistId, id: gistId }, ...gistItems]
      : gistItems;
  });

  const clipboardValue = await env.clipboard.readText();
  if (GIST_URL_PATTERN.test(clipboardValue)) {
    list.value = clipboardValue;
    list.items = [{ label: clipboardValue, id: clipboardValue }, ...gistItems];
  }

  list.onDidAccept(async () => {
    const gist = <GistQuickPickItem>list.selectedItems[0] || list.value;

    list.hide();

    if (gist.id) {
      let gistId = gist.id;
      if (GIST_URL_PATTERN.test(gist.id)) {
        gistId = (<any>GIST_URL_PATTERN.exec(gist.id)!).groups.id;
      }
      if (openAsWorkspace) {
        return openGistAsWorkspace(gistId);
      } else {
        return openGist(gistId, false);
      }
    } else {
      switch (gist.label) {
        case SIGN_IN_ITEM:
          await signIn();
          await openGistInternal();
          return;
        case CREATE_PUBLIC_GIST_ITEM:
          return await newPublicGist();
        case CREATE_SECRET_GIST_ITEM:
          return await newSecretGist();
        case STARRED_GIST_ITEM:
          return await starredGistsInternal();
        default:
      }
    }
  });

  list.show();
}

async function starredGistsInternal() {
  await ensureAuthenticated();

  const gists = await starredGists();
  const items = gists.map(g => ({
    label: getStarredGistLabel(g),
    description: g.description,
    id: g.id
  }));

  if (items.length === 0) {
    const message = `You don't have any starred Gists`;
    return window.showInformationMessage(message);
  }

  const selected = await window.showQuickPick(items, {
    placeHolder: "Select the Gist you'd like to open"
  });

  if (selected) {
    openGist(selected.id);
  }
}

export async function registerGistCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.changeGistDescription`,
      async (node?: GistNode) => {
        await ensureAuthenticated();

        if (node) {
          const description = await window.showInputBox({
            prompt: "Specify the description for this Gist",
            value: node.gist.description
          });

          if (!description) {
            return;
          }
          await changeDescription(node.gist.id, description);
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.copyGistUrl`,
      async (node: GistNode) => {
        await ensureAuthenticated();
        env.clipboard.writeText(node.gist.html_url);
      }
    )
  );

  const DELETE_RESPONSE = "Delete";
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.deleteGist`,
      async (node?: GistNode) => {
        await ensureAuthenticated();

        if (node) {
          const response = await window.showInformationMessage(
            "Are you sure you want to delete this Gist?",
            DELETE_RESPONSE
          );
          if (response !== DELETE_RESPONSE) {
            return;
          }

          await deleteGist(node.gist.id);
        } else if (isGistWorkspace()) {
          const response = await window.showInformationMessage(
            "Are you sure you want to delete this Gist?",
            DELETE_RESPONSE
          );
          if (response !== DELETE_RESPONSE) {
            return;
          }

          const gistId = getGistWorkspaceId();
          deleteGist(gistId);
          commands.executeCommand("workbench.action.closeFolder");
        } else {
          const gists = await listGists();

          if (gists.length === 0) {
            return window.showInformationMessage(
              "You don't have any Gists to delete"
            );
          }

          const items = gists.map(g => ({
            label: getGistLabel(g),
            description: g.description,
            id: g.id
          }));

          const gist = await window.showQuickPick(items, {
            placeHolder: "Select the Gist to delete..."
          });
          if (!gist) {
            return;
          }

          await deleteGist(gist.id);

          window.visibleTextEditors.forEach(editor => {
            if (
              editor.document.uri.scheme === FS_SCHEME &&
              editor.document.uri.authority === gist.id
            ) {
              editor.hide();
            }
          });

          await window.showInformationMessage("Gist deleted!");
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.forkGist`,
      async (node?: StarredGistNode) => {
        await ensureAuthenticated();

        let gistId: string | undefined;
        if (node) {
          gistId = node.gist.id;
        } else if (isGistWorkspace()) {
          gistId = getGistWorkspaceId();
        } else {
          // TODO: Display the list of starred gists
          gistId = await window.showInputBox({
            prompt: "Enter the Gist ID to fork"
          });
          if (!gistId) {
            return;
          }
        }

        await forkGist(gistId!);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_ID}.newPublicGist`, newPublicGist)
  );
  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_ID}.newSecretGist`, newSecretGist)
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.openGist`,
      openGistInternal.bind(null, false)
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.openGistInBrowser`,
      async (node: GistNode) => {
        await ensureAuthenticated();
        env.openExternal(Uri.parse(node.gist.html_url));
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.openGistWorkspace`,
      openGistInternal.bind(null, true)
    )
  );

  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_ID}.refreshGists`, refreshGists)
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.starredGists`,
      starredGistsInternal
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.unstarGist`,
      async (node: StarredGistNode) => {
        await ensureAuthenticated();
        unstarGist(node.gist.id);
      }
    )
  );
}
