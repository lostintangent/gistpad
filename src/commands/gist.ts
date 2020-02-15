import { runInAction } from "mobx";
import { URL } from "url";
import {
  commands,
  env,
  ExtensionContext,
  ProgressLocation,
  QuickPickItem,
  Uri,
  window,
  workspace
} from "vscode";
import { EXTENSION_NAME } from "../constants";
import { log } from "../logger";
import { Gist, GistFile, SortOrder, store } from "../store";
import {
  changeDescription,
  deleteGist,
  forkGist,
  getForks,
  newGist,
  refreshGists,
  starGist,
  starredGists,
  unstarGist
} from "../store/actions";
import { ensureAuthenticated, isAuthenticated, signIn } from "../store/auth";
import {
  FollowedUserGistNode,
  GistNode,
  GistsNode,
  StarredGistNode
} from "../tree/nodes";
import { createGistPadOpenUrl } from "../uriHandler";
import {
  byteArrayToString,
  closeGistFiles,
  encodeDirectoryName,
  fileNameToUri,
  getGistDescription,
  getGistLabel,
  getGistWorkspaceId,
  isGistWorkspace,
  openGist,
  openGistFiles,
  sortGists,
  withProgress
} from "../utils";
const GIST_NAME_PATTERN = /(\/)?(?<owner>([a-z\d]+-)*[a-z\d]+)\/(?<id>[^\/]+)$/i;

export interface GistQuickPickItem extends QuickPickItem {
  id?: string;
}

const newPublicGist = newGistInternal.bind(null, true);
const newSecretGist = newGistInternal.bind(null, false);

async function newGistInternal(isPublic: boolean = true) {
  await ensureAuthenticated();

  const title = "Create new " + (isPublic ? "" : "secret ") + "gist";
  const totalSteps = 2;
  let currentStep = 1;

  const fileNameInputBox = window.createInputBox();
  fileNameInputBox.title = title;
  fileNameInputBox.prompt =
    "Enter the files name(s) to seed the Gist with (can be a comma-seperated list)";
  fileNameInputBox.step = currentStep++;
  fileNameInputBox.totalSteps = totalSteps;
  fileNameInputBox.placeholder = "foo.md";

  fileNameInputBox.onDidAccept(() => {
    const fileName = fileNameInputBox.value;

    if (!fileName) {
      fileNameInputBox.validationMessage =
        "You must specify at least one filename in order to create a gist.";

      // TODO: Have a regex check for valid input
      return;
    }

    fileNameInputBox.hide();

    const descriptionInputBox = window.createInputBox();
    descriptionInputBox.title = title;
    descriptionInputBox.step = currentStep++;
    descriptionInputBox.totalSteps = totalSteps;
    descriptionInputBox.prompt =
      "Enter an optional description for the new Gist";

    descriptionInputBox.onDidAccept(() => {
      descriptionInputBox.hide();
      const description = descriptionInputBox.value;

      return window.withProgress(
        { location: ProgressLocation.Notification, title: "Creating Gist..." },
        () => {
          const files = fileName
            .split(",")
            .map((filename) => ({ filename: encodeDirectoryName(filename) }));
          return newGist(files, isPublic, description);
        }
      );
    });

    descriptionInputBox.show();
  });

  fileNameInputBox.show();
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

interface IOpenGistOptions {
  openAsWorkspace?: boolean;
  node?: GistNode;
  gistUrl?: string;
  gistId?: string;
}

const getGistIdFromUrl = (gistUrl: string) => {
  const url = new URL(gistUrl);
  const { pathname } = url;

  const pathnameComponents = pathname.split("/");
  const id = pathnameComponents[pathnameComponents.length - 1];

  if (!id) {
    log.error(`No gist id found in "${gistUrl}".`);
  }

  return id;
};

async function openGistInternal(
  options: IOpenGistOptions = { openAsWorkspace: false }
) {
  const { node, openAsWorkspace, gistUrl, gistId } = options;

  if (gistUrl || gistId) {
    const id = gistId ? gistId : getGistIdFromUrl(gistUrl!); // (!) since the `gistId` is not set, means the `gistUrl` is set

    return openGist(id, !!openAsWorkspace);
  } else if (node) {
    return openGist(node.gist.id, !!openAsWorkspace);
  }

  let gistItems: GistQuickPickItem[] = [];
  if (await isAuthenticated()) {
    const gists = store.gists;

    if (gists.length > 0) {
      gistItems = gists.map((gist) => {
        return <GistQuickPickItem>{
          label: getGistLabel(gist),
          description: getGistDescription(gist),
          id: gist.id
        };
      });
    }

    gistItems.push(...CREATE_GIST_ITEMS);
  } else {
    gistItems = [{ label: SIGN_IN_ITEM }];
  }

  const list = window.createQuickPick();
  list.placeholder = "Select the gist to open, or specify a gist URL or ID";
  list.items = gistItems;
  list.ignoreFocusOut = true;

  list.onDidChangeValue((gistId) => {
    list.items = gistId
      ? [{ label: gistId, id: gistId }, ...gistItems]
      : gistItems;
  });

  const clipboardValue = await env.clipboard.readText();
  if (GIST_NAME_PATTERN.test(clipboardValue)) {
    list.value = clipboardValue;
    list.items = [{ label: clipboardValue, id: clipboardValue }, ...gistItems];
  }

  list.onDidAccept(async () => {
    const gist = <GistQuickPickItem>list.selectedItems[0] || list.value;

    list.hide();

    // The "id" property is only set on list items
    // that are added in response to user input, as
    // opposed to being part of the list of owned gists.
    if (gist.id) {
      let gistId = gist.id;
      if (GIST_NAME_PATTERN.test(gist.id)) {
        gistId = GIST_NAME_PATTERN.exec(gist.id)!.groups!.id;
      }

      openGist(gistId, !!openAsWorkspace);
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
  const items = sortGists(gists).map((g) => ({
    label: getGistLabel(g),
    description: getGistDescription(g),
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
    openGistFiles(selected.id);
  }
}

export async function registerGistCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.changeGistDescription`,
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
      `${EXTENSION_NAME}.cloneRepository`,
      async (node: GistNode) => {
        commands.executeCommand("git.clone", node.gist.git_pull_url);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.copyGistUrl`,
      async (node: GistNode) => {
        // Note: The "html_url" property doesn't include the Gist's owner
        // in it, and the API doesn't support that URL format
        const url = `https://gist.github.com/${node.gist.owner!.login}/${
          node.gist.id
        }`;
        env.clipboard.writeText(url);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.copyGistPadUrl`,
      async (node: GistNode) => {
        const url = createGistPadOpenUrl(node.gist.id);
        env.clipboard.writeText(url);
      }
    )
  );

  const DELETE_RESPONSE = "Delete";
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.deleteGist`,
      async (targetNode?: GistNode, multiSelectNodes?: GistNode[]) => {
        await ensureAuthenticated();

        if (targetNode) {
          const suffix = multiSelectNodes
            ? "selected gists"
            : `"${targetNode.label}" gist`;

          const response = await window.showInformationMessage(
            `Are you sure you want to delete the ${suffix}?`,
            DELETE_RESPONSE
          );
          if (response !== DELETE_RESPONSE) {
            return;
          }

          const nodes = multiSelectNodes || [targetNode];

          await runInAction(async () => {
            for (const node of nodes) {
              await deleteGist(node.gist.id);
              await closeGistFiles(node.gist);
            }
          });
        } else if (isGistWorkspace()) {
          const response = await window.showInformationMessage(
            "Are you sure you want to delete the opened Gist?",
            DELETE_RESPONSE
          );
          if (response !== DELETE_RESPONSE) {
            return;
          }

          const gistId = getGistWorkspaceId();
          deleteGist(gistId);
          commands.executeCommand("workbench.action.closeFolder");
        } else {
          const gists = store.gists;

          if (gists.length === 0) {
            return window.showInformationMessage(
              "You don't have any Gists to delete"
            );
          }

          const items = gists.map((g) => ({
            label: getGistLabel(g),
            description: getGistDescription(g),
            id: g.id
          }));

          const gist = await window.showQuickPick(items, {
            placeHolder: "Select the Gist to delete..."
          });
          if (!gist) {
            return;
          }

          await withProgress("Deleting gist...", async () => {
            await deleteGist(gist.id);
            await closeGistFiles(gists.find((gist) => gist.id === gist.id)!);
          });
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.forkGist`,
      async (node?: StarredGistNode | FollowedUserGistNode) => {
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

        await window.withProgress(
          { location: ProgressLocation.Notification, title: "Forking Gist..." },
          () => forkGist(gistId!)
        );
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.viewForks`,
      async (node?: StarredGistNode | FollowedUserGistNode) => {
        if (node) {
          const forks = await getForks(node.gist.id);

          if (forks.length === 0) {
            return window.showInformationMessage(
              "This gist doesn't have any forks."
            );
          }

          const getDescription = (gist: Gist) => {
            const isModified = gist.created_at !== gist.updated_at;
            return `${getGistDescription(gist)}${isModified ? " $(edit)" : ""}`;
          };

          const items = sortGists(forks).map((g) => ({
            label: g.owner.login,
            description: getDescription(g),
            id: g.id
          }));

          const selected = await window.showQuickPick(items, {
            placeHolder: "Select the forked gist you'd like to open..."
          });

          if (selected) {
            openGistFiles(selected.id);
          }
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.newPublicGist`, newPublicGist)
  );

  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.newSecretGist`, newSecretGist)
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.openGist`,
      (node?: GistNode | GistsNode) => {
        // We expose the "Open Gist" command on the "Your Gists" node
        // for productivity purposes, but that node doesn't contain
        // a gist, and so if the user is coming in from there, then
        // don't pass on the tree node object to the open gist method.
        const gistNode =
          node instanceof GistNode ||
          node instanceof StarredGistNode ||
          node instanceof FollowedUserGistNode
            ? node
            : undefined;
        openGistInternal({ node: gistNode });
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.openGistInBrowser`,
      async (node: GistNode) => {
        env.openExternal(Uri.parse(node.gist.html_url));
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.openGistInNbViewer`,
      async (node: GistNode) => {
        const url = `https://nbviewer.jupyter.org/gist/${node.gist.owner.login}/${node.gist.id}`;
        env.openExternal(Uri.parse(url));
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.openGistWorkspace`,
      (node?: GistNode) => {
        openGistInternal({ node, openAsWorkspace: true });
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.refreshGists`, refreshGists)
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.sortGistsAlphabetically`,
      () => {
        store.sortOrder = SortOrder.alphabetical;
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.sortGistsByUpdatedTime`, () => {
      store.sortOrder = SortOrder.updatedTime;
    })
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.starredGists`,
      starredGistsInternal
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.unstarGist`,
      async (
        targetNode: StarredGistNode,
        multiSelectNodes?: StarredGistNode[]
      ) => {
        await ensureAuthenticated();

        const nodes = multiSelectNodes || [targetNode];
        for (const node of nodes) {
          unstarGist(node.gist.id);
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.starGist`,
      async (
        targetNode: GistNode | FollowedUserGistNode,
        multiSelectNodes?: GistNode[] | FollowedUserGistNode[]
      ) => {
        await ensureAuthenticated();

        const nodes = multiSelectNodes || [targetNode];
        for (const node of nodes) {
          starGist(node.gist);
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.duplicateGist`,
      async (node: GistNode) => {
        await ensureAuthenticated();

        const description = await window.showInputBox({
          prompt: "Enter an optional description for the new Gist",
          value: node.gist.description
        });

        await window.withProgress(
          {
            location: ProgressLocation.Notification,
            title: "Duplicating Gist..."
          },
          async () => {
            const files: GistFile[] = [];
            for (const filename of Object.keys(node.gist.files)) {
              // TODO: Replace this with a Git operation, since the duplicated
              // gist might contain images, that wouldn't support this
              const content = byteArrayToString(
                await workspace.fs.readFile(
                  fileNameToUri(node.gist.id, filename)
                )
              );
              files.push({
                filename,
                content
              });
            }

            newGist(files, node.gist.public, description);
          }
        );
      }
    )
  );
}
