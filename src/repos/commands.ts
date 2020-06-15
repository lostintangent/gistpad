import * as path from "path";
import {
  commands,
  env,
  ExtensionContext,
  Uri,
  window,
  workspace
} from "vscode";
import { EXTENSION_NAME } from "../constants";
import { withProgress } from "../utils";
import {
  addRepoFile,
  deleteRepoFile,
  listRepos,
  manageRepo,
  refreshRepositories,
  renameFile,
  unmanageRepo
} from "./store/actions";
import { RepositoryFileNode, RepositoryNode } from "./tree/nodes";

function getGitHubUrl(repo: string, path?: string) {
  const suffix = path ? `/blob/master/${path}` : "";
  return `https://github.com/${repo}${suffix}`;
}

let repoPromise: Promise<any>;
export async function registerRepoCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.manageRepository`, async () => {
      const quickPick = window.createQuickPick();
      quickPick.title = "Select or specify the repository you'd like to manage";

      if (!repoPromise) {
        repoPromise = listRepos();
      }

      quickPick.busy = true;
      quickPick.placeholder = "Loading repository list...";

      repoPromise.then((repos) => {
        const items = repos.map((repo: any) => ({
          label: repo.full_name,
          description: repo.private ? "Private" : ""
        }));

        quickPick.items = items;

        quickPick.onDidChangeValue(() => {
          if (quickPick.value) {
            quickPick.items = [{ label: quickPick.value }, ...items];
          } else {
            quickPick.items = items;
          }
        });

        quickPick.busy = false;
      });

      quickPick.onDidAccept(async () => {
        quickPick.hide();
        await manageRepo(quickPick.selectedItems[0].label);
      });

      quickPick.show();
    })
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.unmanageRepository`,
      async (
        targetNode: RepositoryNode,
        multiSelectNodes?: RepositoryNode[]
      ) => {
        const nodes = multiSelectNodes || [targetNode];

        for (const node of nodes) {
          await unmanageRepo(node.repo.name);
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.copyRepositoryUrl`,
      async (node: RepositoryNode) => {
        const url = getGitHubUrl(node.repo.name);
        env.clipboard.writeText(url);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.copyRepositoryFileUrl`,
      async (node: RepositoryFileNode) => {
        const url = getGitHubUrl(node.repo.name, node.file.path);
        env.clipboard.writeText(url);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.openRepositoryInBrowser`,
      async (node: RepositoryNode) => {
        const url = getGitHubUrl(node.repo.name);
        env.openExternal(Uri.parse(url));
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.openRepositoryFileInBrowser`,
      async (node: RepositoryFileNode) => {
        const url = getGitHubUrl(node.repo.name, node.file.path);
        env.openExternal(Uri.parse(url));
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.addRepositoryFile`,
      async (node: RepositoryNode | RepositoryFileNode) => {
        const path = await window.showInputBox({
          prompt:
            "Enter the path of the file you'd like to create (e.g. foo.js, bar/baz.md)"
        });

        if (path) {
          const filePath =
            node instanceof RepositoryFileNode
              ? `${node.file.path}/${path}`
              : path;

          await withProgress("Adding new file...", () =>
            addRepoFile(node.repo.name, filePath)
          );

          const uri = Uri.parse(`repo:/${node.repo.name}/${filePath}`);
          window.showTextDocument(uri);
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.duplicateRepositoryFile`,
      async (node: RepositoryFileNode) => {
        const extension = path.extname(node.file.path);
        const rootFileName = node.file.path.replace(extension, "");
        const duplicateFileName = `${rootFileName} - Copy${extension}`;

        const filePath = await window.showInputBox({
          placeHolder: "Specify the name of the new duplicated file",
          value: duplicateFileName
        });

        if (!filePath) {
          return;
        }

        await withProgress("Duplicating file...", async () => {
          const contents = await workspace.fs.readFile(
            Uri.parse(`repo:/${node.repo.name}/${node.file.path}`)
          );

          return addRepoFile(
            node.repo.name,
            filePath,
            // @ts-ignore
            contents.toString("base64")
          );
        });
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.cloneManagedRepository`,
      async (node: RepositoryNode) => {
        const url = `https://github.com/${node.repo.name}.git`;
        commands.executeCommand("git.clone", url);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.deleteRepositoryFile`,
      async (node: RepositoryFileNode) => {
        if (
          await window.showInformationMessage(
            `Are you sure you want to delete the "${node.file.name}" file?`,
            "Delete"
          )
        ) {
          return withProgress("Deleting file...", () =>
            deleteRepoFile(node.file)
          );
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.renameRepositoryFile`,
      async (node: RepositoryFileNode) => {
        const response = await window.showInputBox({
          prompt: "Specify the new name of the file",
          value: node.file.path
        });

        if (response && response !== node.file.path) {
          await withProgress("Renaming file...", () =>
            renameFile(node.file, response)
          );
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.refreshRepositories`,
      refreshRepositories
    )
  );
}
