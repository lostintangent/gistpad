import { runInAction } from "mobx";
import { URL } from "url";
import {
  commands,
  env,
  ExtensionContext,
  ProgressLocation,
  QuickPickItem,
  TextEditor,
  Uri,
  window,
  workspace
} from "vscode";
import { EXTENSION_NAME } from "../constants";
import { updateGistFiles } from "../fileSystem/api";
import { duplicateGist, exportToRepo } from "../fileSystem/git";
import { openRepo } from "../repos/store/actions";
import { Gist, GistFile, GroupType, SortOrder, store } from "../store";
import {
  archiveGist,
  changeDescription,
  deleteGist,
  forkGist,
  getForks,
  newGist,
  refreshGist,
  refreshGists,
  starGist,
  starredGists,
  unarchiveGist,
  unstarGist
} from "../store/actions";
import { ensureAuthenticated, getApi, signIn } from "../store/auth";
import {
  FollowedUserGistNode,
  GistGroupNode,
  GistNode,
  GistsNode,
  StarredGistNode
} from "../tree/nodes";
import { createGistPadOpenUrl, createGistPadWebUrl } from "../uriHandler";
import {
  byteArrayToString,
  closeGistFiles,
  encodeDirectoryName,
  fileNameToUri,
  getGistDescription,
  getGistDetailsFromUri,
  getGistLabel,
  getGistWorkspaceId,
  isArchivedGist,
  isGistWorkspace,
  isOwnedGist,
  openGist,
  openGistFiles,
  sortGists,
  updateGistTags,
  withProgress
} from "../utils";
const isBinaryPath = require("is-binary-path");
const path = require("path");

const GIST_NAME_PATTERN =
  /(\/)?(?<owner>([a-z\d]+-)*[a-z\d]+)\/(?<id>[^\/]+)$/i;

export interface GistQuickPickItem extends QuickPickItem {
  id?: string;
}

const newPublicGist = newGistInternal.bind(null, true);
const newSecretGist = newGistInternal.bind(null, false);

async function newGistInternal(
  isPublic: boolean = true,
  description: string = ""
) {
  await ensureAuthenticated();

  const title = "Create new " + (isPublic ? "" : "secret ") + "gist";
  const totalSteps = 2;
  let currentStep = 1;

  const descriptionInputBox = window.createInputBox();
  descriptionInputBox.title = title;
  descriptionInputBox.prompt = "Enter an optional description for the new Gist";
  descriptionInputBox.step = currentStep++;
  descriptionInputBox.totalSteps = totalSteps;
  descriptionInputBox.value = description;
  descriptionInputBox.valueSelection = [0, 0];

  descriptionInputBox.onDidAccept(() => {
    descriptionInputBox.hide();
    const description = descriptionInputBox.value;

    const fileNameInputBox = window.createInputBox();
    fileNameInputBox.title = title;
    fileNameInputBox.prompt =
      "Enter the files name(s) to seed the Gist with (can be a comma-separated list)";
    fileNameInputBox.step = currentStep++;
    fileNameInputBox.totalSteps = totalSteps;
    fileNameInputBox.placeholder = "foo.md";

    fileNameInputBox.onDidAccept(() => {
      fileNameInputBox.hide();

      const fileName = fileNameInputBox.value;

      if (!fileName) {
        fileNameInputBox.validationMessage =
          "You must specify at least one filename in order to create a gist.";

        // TODO: Have a regex check for valid input
        return;
      }

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

    fileNameInputBox.show();
  });

  descriptionInputBox.show();
}

async function syncGistFileInternal(textEditor: TextEditor) {
  await ensureAuthenticated();

  await window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: "Syncing changes with gist..."
    },
    async () => {
      const uri = textEditor.document.uri;
      const { gistId } = getGistDetailsFromUri(uri);

      if (!isOwnedGist(gistId)) {
        throw new Error("You can't sync a Gist you don't own");
      }

      const content = textEditor.document.getText();
      const filename = path.basename(uri.path);

      await updateGistFiles(gistId, [
        [filename, { content }],
      ]);

      store.unsyncedFiles.delete(uri.toString());
    }
  )
    .then(
      () => { },
      (err) => {
        // TODO how to close the progress dialog first?
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        window.showErrorMessage(`Failed to sync file: ${message}`);
      }
    );
}

const SIGN_IN_ITEM = "Sign in to view Gists...";
const CREATE_PUBLIC_GIST_ITEM = "$(gist-new) Create new public Gist...";
const CREATE_SECRET_GIST_ITEM = "$(gist-private) Create new secret Gist...";
const STARRED_GIST_ITEM = "$(star) View starred Gists...";
const CREATE_GIST_ITEMS = [
  { label: CREATE_PUBLIC_GIST_ITEM },
  { label: CREATE_SECRET_GIST_ITEM },
  { label: STARRED_GIST_ITEM }
];

interface IOpenGistOptions {
  openAsWorkspace?: boolean;
  forceNewWindow?: boolean;
  node?: GistNode;
  gistUrl?: string;
  gistId?: string;
}

const getGistIdFromUrl = (gistUrl: string) => {
  const url = new URL(gistUrl);
  const { pathname } = url;

  const pathnameComponents = pathname.split("/");
  const id = pathnameComponents[pathnameComponents.length - 1];
  return id;
};

async function openGistInternal(
  options: IOpenGistOptions = { openAsWorkspace: false, forceNewWindow: false }
) {
  const { node, openAsWorkspace, forceNewWindow, gistUrl, gistId } = options;

  if (gistUrl || gistId) {
    const id = gistId ? gistId : getGistIdFromUrl(gistUrl!); // (!) since the `gistId` is not set, means the `gistUrl` is set

    return openGist(id, !!openAsWorkspace, !!forceNewWindow);
  } else if (node) {
    return openGist(node.gist.id, !!openAsWorkspace, !!forceNewWindow);
  }

  let gistItems: GistQuickPickItem[] = [];
  if (store.isSignedIn) {
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
          // If this is an archived gist, we need to remove the "archived" prefix
          const isArchived = isArchivedGist(node.gist);

          const description = isArchived
            ? node.gist.description.replace(" [Archived]", "")
            : node.gist.description;
          let newDescription = await window.showInputBox({
            prompt: "Specify the description for this Gist",
            value: description
          });

          if (!newDescription) {
            return;
          }

          // If the gist was archived, we need to add the "archived" prefix
          // back to the description, since we stripped it out above.
          if (isArchived) {
            newDescription += " [Archived]";
          }

          await changeDescription(node.gist.id, newDescription);
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
        const url = `https://gist.github.com/${node.gist.owner!.login}/${node.gist.id
          }`;
        env.clipboard.writeText(url);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.copyGistPadUrl`,
      async (node: GistNode) => {
        const url =
          node.gist.type === "note"
            ? createGistPadWebUrl(node.gist.id)
            : createGistPadOpenUrl(node.gist.id);

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
    commands.registerCommand(`${EXTENSION_NAME}.newPublicGist`, () =>
      newPublicGist()
    )
  );

  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.newSecretGist`, () =>
      newSecretGist()
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.newGistFromTag`,
      (node: GistGroupNode) => {
        const description = ` #${node.label}`;
        newSecretGist(description);
      }
    )
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
      async (node?: GistNode) => {
        let gist: Gist | undefined;
        
        if (node) {
          // Called from tree context with GistNode
          gist = node.gist;
        } else {
          // Called from editor context - use active editor
          const editor = window.activeTextEditor;
          if (!editor || editor.document.uri.scheme !== 'gist') {
            return;
          }
          
          const { gistId } = getGistDetailsFromUri(editor.document.uri);
          
          // Find the gist in the store
          gist = store.gists.find(g => g.id === gistId) ||
                 store.archivedGists.find(g => g.id === gistId) ||
                 store.starredGists.find(g => g.id === gistId);
          
          if (!gist) {
            // Fallback: construct URL manually
            const url = `https://gist.github.com/${gistId}`;
            env.openExternal(Uri.parse(url));
            return;
          }
        }

        if (!gist) {
          return;
        }

        let url = gist.html_url;
        if (gist.type === "note") {
          url = createGistPadWebUrl(gist.id);
        }

        env.openExternal(Uri.parse(url));
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
    commands.registerCommand(
      `${EXTENSION_NAME}.openGistNewWindow`,
      (node?: GistNode) => {
        openGistInternal({ node, openAsWorkspace: true, forceNewWindow: true });
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
    commands.registerCommand(`${EXTENSION_NAME}.groupGists`, () => {
      store.groupType = GroupType.tagAndType;
    })
  );

  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.ungroupGists`, () => {
      store.groupType = GroupType.none;
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
      `${EXTENSION_NAME}.exportToRepo`,
      async (node: GistNode) => {
        if (!store.canCreateRepos) {
          return window.showErrorMessage(
            'The token you used to login doesn\'t include the "repo" scope.'
          );
        }

        const repoName = await window.showInputBox({
          prompt: "Specify the name of the repository to create",
          value: node.gist.description || ""
        });

        if (!repoName) {
          return;
        }

        let repoUri, fullName;
        await withProgress("Exporting to repository...", async () => {
          const api = await getApi();

          const name = repoName.replace(/\s/g, "-").replace(/[^\w\d-_]/g, "");
          const response = await api.post("/user/repos", {
            name,
            description: node.gist.description,
            private: !node.gist.public
          });

          repoUri = Uri.parse(response.body.html_url);
          fullName = `${store.login}/${name}`;

          // TODO: Accomodate scenarios where the end-user
          // doesn't have Git installed
          await exportToRepo(node.gist.id, name);
          await openRepo(fullName, true);
        });

        if (
          await window.showInformationMessage(
            `Gist successfully exported to "${fullName}".`,
            "Open in browser"
          )
        ) {
          // @ts-ignore
          return env.openExternal(repoUri);
        }
      }
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
            const includesBinaryFile = Object.keys(node.gist.files).some(
              isBinaryPath
            );

            if (includesBinaryFile) {
              // Create a new gist with a "placeholder" file,
              // since gists aren't allowed to be empty.
              const gist = await newGist(
                [{ filename: "placeholder", content: "" }],
                node.gist.public,
                description,
                false
              );

              await duplicateGist(node.gist.id, gist.id);

              // Since the created gist doesn't include the files
              // that were pushed via git, we need to refresh it
              // in our local Mobx store and then update the tags
              await refreshGist(gist.id);
              await updateGistTags(gist);
            } else {
              const files: GistFile[] = [];
              for (const filename of Object.keys(node.gist.files)) {
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

              await newGist(files, node.gist.public, description);
            }
          }
        );
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.archiveGist`,
      async (node: GistNode) => {
        await ensureAuthenticated();
        await withProgress("Archiving gist...", () =>
          archiveGist(node.gist.id)
        );
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.unarchiveGist`,
      async (node: GistNode) => {
        await ensureAuthenticated();
        await withProgress("Unarchiving gist...", () =>
          unarchiveGist(node.gist.id)
        );
      }
    )
  );

  context.subscriptions.push(
    commands.registerTextEditorCommand(
      `${EXTENSION_NAME}.syncGistFile`,
      syncGistFileInternal
    )
  );
}
