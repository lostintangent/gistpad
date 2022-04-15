import * as fs from "fs";
import * as path from "path";
import { URL } from "url";
import {
  commands,
  env,
  ExtensionContext,
  extensions,
  QuickInputButtons,
  Uri,
  window,
  workspace
} from "vscode";
import { EXTENSION_NAME } from "../constants";
import { store as globalStore } from "../store";
import { elevateSignin, getCurrentUser } from "../store/auth";
import { byteArrayToString, withProgress } from "../utils";
import { RepoFileSystemProvider } from "./fileSystem";
import { Repository } from "./store";
import {
  addRepoFile,
  closeRepo,
  createBranch,
  createRepository,
  createRepositoryFromTemplate,
  deleteBranch,
  deleteRepository,
  getBranches,
  listRepos,
  openRepo,
  rebaseBranch,
  refreshRepositories
} from "./store/actions";
import { RepositoryFileNode, RepositoryNode } from "./tree/nodes";
import { openRepoDocument } from "./utils";
import moment = require("moment");

function getGitHubUrl(repo: string, branch: string, filePath?: string) {
  const suffix = filePath
    ? `/blob/${branch}/${filePath}`
    : branch !== Repository.DEFAULT_BRANCH
    ? `/tree/${branch}`
    : "";

  return `https://github.com/${repo}${suffix}`;
}

const WELL_KNOWN_TEMPLATES = [
  {
    name: "Foam-style wiki",
    template: "foambubble/foam-template"
  }
];

const CREATE_REPO_RESPONSE = "$(add) Create repo...";
const CREATE_TEMPLATE_REPO_RESPONSE = "$(add) Create repo from template...";
const CREATE_PRIVATE_REPO_RESPONSE = "$(lock) Create private repo...";
const CREATE_PRIVATE_TEMPLATE_REPO_RESPONSE =
  "$(lock) Create private repo from template...";

const CREATE_REPO_ITEMS = [
  { label: CREATE_REPO_RESPONSE, alwaysShow: true },
  { label: CREATE_TEMPLATE_REPO_RESPONSE, alwaysShow: true },
  { label: CREATE_PRIVATE_REPO_RESPONSE, alwaysShow: true },
  { label: CREATE_PRIVATE_TEMPLATE_REPO_RESPONSE, alwaysShow: true }
];

let repoPromise: Promise<any>;
export async function registerRepoCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.openRepository`, async () => {
      const quickPick = window.createQuickPick();
      quickPick.title = "Select or specify the repository you'd like to open";

      let items: any[] = [];
      if (globalStore.isSignedIn) {
        if (!repoPromise) {
          repoPromise = listRepos();
        }

        quickPick.busy = true;
        quickPick.placeholder = "Loading your repositories...";
        quickPick.items = CREATE_REPO_ITEMS;

        repoPromise.then((repos) => {
          items = [
            ...CREATE_REPO_ITEMS,
            ...repos.map((repo: any) => ({
              label: repo.full_name,
              description: repo.private ? "Private" : ""
            }))
          ];

          quickPick.items = items;

          quickPick.busy = false;
          quickPick.placeholder = "";
        });
      }

      quickPick.onDidChangeValue(() => {
        if (quickPick.value) {
          quickPick.items = [{ label: quickPick.value }, ...items];
        } else {
          quickPick.items = items;
        }
      });

      quickPick.onDidAccept(async () => {
        quickPick.hide();

        const response = quickPick.selectedItems[0].label;

        if (
          response === CREATE_REPO_RESPONSE ||
          response === CREATE_PRIVATE_REPO_RESPONSE
        ) {
          if (!globalStore.canCreateRepos) {
            return window.showErrorMessage(
              'The token you used to login doesn\'t include the "repo" scope.'
            );
          }
          const repoName = await window.showInputBox({
            prompt: "Specify the name of the repository to create"
          });

          if (!repoName) {
            return;
          }

          await withProgress("Creating repository...", async () => {
            const repository = await createRepository(
              repoName,
              response === CREATE_PRIVATE_REPO_RESPONSE
            );
            await openRepo(repository.full_name);
          });
        } else if (
          response === CREATE_TEMPLATE_REPO_RESPONSE ||
          response === CREATE_PRIVATE_TEMPLATE_REPO_RESPONSE
        ) {
          const templateQuickPick = window.createQuickPick();
          templateQuickPick.title =
            "Select or specify the repo template to use";

          const templateItems = WELL_KNOWN_TEMPLATES.map((template) => {
            return {
              label: template.name,
              description: template.template
            };
          });

          templateQuickPick.buttons = [QuickInputButtons.Back];
          templateQuickPick.items = templateItems;

          templateQuickPick.onDidTriggerButton((e) =>
            commands.executeCommand(`${EXTENSION_NAME}.openRepository`)
          );

          templateQuickPick.onDidChangeValue(() => {
            if (templateQuickPick.value) {
              templateQuickPick.items = [
                { label: templateQuickPick.value },
                ...templateItems
              ];
            } else {
              templateQuickPick.items = templateItems;
            }
          });

          templateQuickPick.onDidAccept(async () => {
            templateQuickPick.hide();

            const template =
              templateQuickPick.selectedItems[0].description ||
              templateQuickPick.selectedItems[0].label;

            if (template) {
              const repoName = await window.showInputBox({
                prompt: "Specify the name of the repository to create"
              });

              if (!repoName) {
                return;
              }

              await withProgress(`Creating repository...`, async () => {
                const { full_name } = await createRepositoryFromTemplate(
                  template,
                  repoName,
                  response === CREATE_PRIVATE_TEMPLATE_REPO_RESPONSE
                );

                await openRepo(full_name, true);
              });
            }
          });

          templateQuickPick.show();
        } else {
          await openRepo(response, true);
        }
      });

      quickPick.show();
    })
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.closeRepository`,
      async (
        targetNode: RepositoryNode,
        multiSelectNodes?: RepositoryNode[]
      ) => {
        const nodes = multiSelectNodes || [targetNode];

        for (const node of nodes) {
          await closeRepo(node.repo.name, node.repo.branch);
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
          const uri = RepoFileSystemProvider.getFileUri(
            node.repo.name,
            node.file.path
          );
          const contents = await workspace.fs.readFile(uri);

          return addRepoFile(
            node.repo.name,
            node.repo.branch,
            filePath,
            byteArrayToString(contents)
          );
        });

        openRepoDocument(node.repo.name, filePath);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.uploadRepositoryFile`,
      async (node: RepositoryNode | RepositoryFileNode) => {
        const files = await window.showOpenDialog({
          canSelectMany: true,
          openLabel: "Upload"
        });

        if (files) {
          withProgress("Uploading file(s)...", () =>
            Promise.all(
              files.map((file) => {
                const fileName = path.basename(file.path);
                const content = fs.readFileSync(new URL(file.toString()));

                const filePath =
                  node instanceof RepositoryFileNode
                    ? `${node.file.path}/${fileName}`
                    : fileName;

                return workspace.fs.writeFile(
                  RepoFileSystemProvider.getFileUri(node.repo.name, filePath),
                  content
                );
              })
            )
          );
        }
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

  async function deleteTreeNode(node: RepositoryFileNode) {
    const fileType = node.file.isDirectory ? "directory" : "file";
    if (
      await window.showInformationMessage(
        `Are you sure you want to delete the "${node.file.name}" ${fileType}?`,
        "Delete"
      )
    ) {
      return withProgress(`Deleting ${fileType}...`, async () => {
        const uri = RepoFileSystemProvider.getFileUri(
          node.repo.name,
          node.file.path
        );

        return workspace.fs.delete(uri);
      });
    }
  }

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.deleteRepositoryDirectory`,
      deleteTreeNode
    ),
    commands.registerCommand(
      `${EXTENSION_NAME}.deleteRepositoryFile`,
      deleteTreeNode
    )
  );

  async function renameTreeNode(node: RepositoryFileNode) {
    const fileType = node.file.isDirectory ? "directory" : "file";
    const response = await window.showInputBox({
      prompt: `Specify the new name of the ${fileType}`,
      value: node.file.path
    });

    if (response && response !== node.file.path) {
      await withProgress(`Renaming ${fileType}`, async () => {
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

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.renameRepositoryDirectory`,
      renameTreeNode
    ),
    commands.registerCommand(
      `${EXTENSION_NAME}.renameRepositoryFile`,
      renameTreeNode
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

            await closeRepo(node.repo.name, node.repo.branch);
            await openRepo(node.repo.name);
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

          await closeRepo(node.repo.name, node.repo.branch);
          await openRepo(node.repo.name);
        });
      }
    )
  );

  const CREATE_BRANCH_RESPONSE = "$(add) Create new branch";
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.switchRepositoryBranch`,
      async (node: RepositoryNode) => {
        const quickPick = window.createQuickPick();
        quickPick.title = "Select the branch you'd like to manage";
        quickPick.placeholder = "Loading branches...";
        quickPick.busy = true;
        quickPick.show();

        const branches = (await getBranches(node.repo.name))
          .sort()
          .filter((branch: any) => branch.name !== node.repo.branch);

        quickPick.items = [
          {
            label: CREATE_BRANCH_RESPONSE,
            alwaysShow: true
          },
          ...branches.map((branch: any) => ({
            label: branch.name
          }))
        ];

        quickPick.busy = false;
        quickPick.placeholder =
          branches.length > 0
            ? ""
            : "This repository doesn't have other branches";

        quickPick.onDidAccept(async () => {
          quickPick.hide();

          const branch = quickPick.selectedItems[0].label;
          if (branch === CREATE_BRANCH_RESPONSE) {
            const user = await getCurrentUser();
            const date = moment().format("L");
            const newBranch = await window.showInputBox({
              prompt: "Specify the name of the branch",
              value: `${user}/${date}`
            });

            if (newBranch) {
              await withProgress("Creating branch...", async () => {
                await createBranch(
                  node.repo.name,
                  newBranch,
                  node.repo.latestCommit
                );

                await closeRepo(node.repo.name, node.repo.branch);
                await openRepo(`${node.repo.name}#${newBranch}`);
              });
            }
          } else {
            await closeRepo(node.repo.name, node.repo.branch);
            await openRepo(`${node.repo.name}#${branch}`);
          }
        });
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.deleteRepository`,
      async (node: RepositoryNode) => {
        if (!globalStore.canDeleteRepos) {
          const response = await window.showInformationMessage(
            "In order for GistPad to delete repos on your behalf, you need to authorize it.",
            "Authorize"
          );

          if (!response) {
            return;
          }

          const authorized = await elevateSignin();
          if (!authorized) {
            return;
          }
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
              await closeRepo(node.repo.name, node.repo.branch);
            });
          } catch (e) {
            if (
              await window.showErrorMessage(
                "You don't have permission to delete this repository. Would you like to stop managing it?",
                "Stop managing"
              )
            ) {
              await closeRepo(node.repo.name, node.repo.branch);
            }
          }
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.openRepositorySwing`,
      async (node: RepositoryNode) => {
        const uri = RepoFileSystemProvider.getFileUri(node.repo.name);
        const extension = extensions.getExtension(
          "codespaces-contrib.codeswing"
        );

        if (extension!.isActive) {
          await extension?.activate();
        }

        extension?.exports.openSwing(uri);
      }
    )
  );
}
