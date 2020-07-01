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
import { store as globalStore } from "../store";
import { getCurrentUser } from "../store/auth";
import { withProgress } from "../utils";
import { RepoFileSystemProvider } from "./fileSystem";
import { Repository } from "./store";
import {
  addRepoFile,
  createBranch,
  deleteBranch,
  deleteRepository,
  displayReadme,
  listRepos,
  manageRepo,
  rebaseBranch,
  refreshRepositories,
  unmanageRepo
} from "./store/actions";
import { promptForTour } from "./tours/actions";
import { RepositoryFileNode, RepositoryNode } from "./tree/nodes";
import moment = require("moment");

function getGitHubUrl(repo: string, branch: string, filePath?: string) {
  const suffix = filePath
    ? `/blob/${branch}/${filePath}`
    : branch !== Repository.DEFAULT_BRANCH
    ? `/tree/${branch}`
    : "";

  return `https://github.com/${repo}${suffix}`;
}

function openRepoDocument(repo: string, file: string) {
  const uri = RepoFileSystemProvider.getFileUri(repo, file);
  window.showTextDocument(uri);
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
      quickPick.placeholder = "Loading your repositories...";

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
        quickPick.placeholder = "";
      });

      quickPick.onDidAccept(async () => {
        quickPick.hide();
        const repository = await manageRepo(quickPick.selectedItems[0].label);
        if (repository) {
          displayReadme(repository);
          promptForTour(repository);
        }
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
          await unmanageRepo(node.repo.name, node.repo.branch);
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.copyRepositoryUrl`,
      async (node: RepositoryNode) => {
        const url = getGitHubUrl(node.repo.name, node.repo.branch);
        env.clipboard.writeText(url);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.copyRepositoryFileUrl`,
      async (node: RepositoryFileNode) => {
        const url = getGitHubUrl(
          node.repo.name,
          node.repo.branch,
          node.file.path
        );
        env.clipboard.writeText(url);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.openRepositoryInBrowser`,
      async (node: RepositoryNode) => {
        const url = getGitHubUrl(node.repo.name, node.repo.branch);
        env.openExternal(Uri.parse(url));
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.openRepositoryFileInBrowser`,
      async (node: RepositoryFileNode) => {
        const url = getGitHubUrl(
          node.repo.name,
          node.repo.branch,
          node.file.path
        );
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
            addRepoFile(node.repo.name, node.repo.branch, filePath)
          );

          openRepoDocument(node.repo.name, filePath);
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
            node.repo.branch,
            filePath,
            // @ts-ignore
            contents.toString("base64")
          );
        });

        openRepoDocument(node.repo.name, filePath);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.cloneManagedRepository`,
      async (node: RepositoryNode) => {
        // TODO: Add support for branches
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
          return withProgress("Deleting file...", async () => {
            const uri = RepoFileSystemProvider.getFileUri(
              node.repo.name,
              node.file.path
            );

            return workspace.fs.delete(uri);
          });
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
          await withProgress("Renaming file...", async () => {
            const fileUri = RepoFileSystemProvider.getFileUri(
              node.repo.name,
              node.file.path
            );
            const newFileUri = RepoFileSystemProvider.getFileUri(
              node.repo.name,
              response
            );

            return workspace.fs.rename(fileUri, newFileUri);
          });
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

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.createRepositoryBranch`,
      async (node: RepositoryNode) => {
        const user = await getCurrentUser();
        const date = moment().format("L");
        const branch = await window.showInputBox({
          prompt: "Specify the name of the branch",
          value: `${user}/${date}`
        });

        if (branch) {
          await withProgress("Creating branch...", async () => {
            await createBranch(node.repo.name, branch, node.repo.latestCommit);

            await unmanageRepo(node.repo.name, node.repo.branch);
            await manageRepo(`${node.repo.name}#${branch}`);
          });
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.deleteRepositoryBranch`,
      async (node: RepositoryNode) => {
        if (
          await window.showInformationMessage(
            `Are you sure you want to delete the "${node.repo.branch}" branch?`,
            "Delete branch"
          )
        ) {
          await withProgress("Deleting branch...", async () => {
            await deleteBranch(node.repo.name, node.repo.branch);

            await unmanageRepo(node.repo.name, node.repo.branch);
            await manageRepo(`${node.repo.name}`);
          });
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.mergeRepositoryBranch`,
      async (node: RepositoryNode) => {
        const response = await window.showInputBox({
          prompt: "Specify a description of your changes",
          value: `Merging ${node.repo.branch}`
        });

        await withProgress("Merging branch...", async () => {
          await rebaseBranch(node.repo.name, node.repo.branch, response);

          await unmanageRepo(node.repo.name, node.repo.branch);
          await manageRepo(node.repo.name);
        });
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.deleteRepository`,
      async (node: RepositoryNode) => {
        if (!globalStore.canDeleteRepos) {
          return window.showErrorMessage(
            'The token you used to login doesn\'t include the "delete_repo" scope.'
          );
        }

        if (
          await window.showInformationMessage(
            `Are you sure you want to delete the "${node.repo.name}" repository?`,
            "Delete repository"
          )
        ) {
          try {
            await withProgress("Deleting repository...", async () => {
              await deleteRepository(node.repo.name);
              await unmanageRepo(node.repo.name, node.repo.branch);
            });
          } catch (e) {
            if (
              await window.showErrorMessage(
                "You don't have permission to delete this repository. Would you like to stop managing it?",
                "Stop managing"
              )
            ) {
              await unmanageRepo(node.repo.name, node.repo.branch);
            }
          }
        }
      }
    )
  );
}
