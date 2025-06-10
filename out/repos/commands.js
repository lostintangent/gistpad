"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRepoCommands = registerRepoCommands;
const fs = require("fs");
const path = require("path");
const url_1 = require("url");
const vscode_1 = require("vscode");
const constants_1 = require("../constants");
const store_1 = require("../store");
const auth_1 = require("../store/auth");
const utils_1 = require("../utils");
const fileSystem_1 = require("./fileSystem");
const actions_1 = require("./store/actions");
const nodes_1 = require("./tree/nodes");
const utils_2 = require("./utils");
const moment = require("moment");
function getGitHubUrl(repo, branch, defaultBranch, filePath) {
    const suffix = filePath
        ? `/blob/${branch}/${filePath}`
        : branch !== defaultBranch
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
const CREATE_PRIVATE_TEMPLATE_REPO_RESPONSE = "$(lock) Create private repo from template...";
const CREATE_REPO_ITEMS = [
    { label: CREATE_REPO_RESPONSE, alwaysShow: true },
    { label: CREATE_TEMPLATE_REPO_RESPONSE, alwaysShow: true },
    { label: CREATE_PRIVATE_REPO_RESPONSE, alwaysShow: true },
    { label: CREATE_PRIVATE_TEMPLATE_REPO_RESPONSE, alwaysShow: true }
];
let repoPromise;
async function registerRepoCommands(context) {
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.openRepository`, async () => {
        const quickPick = vscode_1.window.createQuickPick();
        quickPick.title = "Select or specify the repository you'd like to open";
        let items = [];
        if (store_1.store.isSignedIn) {
            if (!repoPromise) {
                repoPromise = (0, actions_1.listRepos)();
            }
            quickPick.busy = true;
            quickPick.placeholder = "Loading your repositories...";
            quickPick.items = CREATE_REPO_ITEMS;
            repoPromise.then((repos) => {
                items = [
                    ...CREATE_REPO_ITEMS,
                    ...repos.map((repo) => ({
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
            }
            else {
                quickPick.items = items;
            }
        });
        quickPick.onDidAccept(async () => {
            quickPick.hide();
            const response = quickPick.selectedItems[0].label;
            if (response === CREATE_REPO_RESPONSE ||
                response === CREATE_PRIVATE_REPO_RESPONSE) {
                if (!store_1.store.canCreateRepos) {
                    return vscode_1.window.showErrorMessage('The token you used to login doesn\'t include the "repo" scope.');
                }
                const repoName = await vscode_1.window.showInputBox({
                    prompt: "Specify the name of the repository to create"
                });
                if (!repoName) {
                    return;
                }
                await (0, utils_1.withProgress)("Creating repository...", async () => {
                    const repository = await (0, actions_1.createRepository)(repoName, response === CREATE_PRIVATE_REPO_RESPONSE);
                    await (0, actions_1.openRepo)(repository.full_name);
                });
            }
            else if (response === CREATE_TEMPLATE_REPO_RESPONSE ||
                response === CREATE_PRIVATE_TEMPLATE_REPO_RESPONSE) {
                const templateQuickPick = vscode_1.window.createQuickPick();
                templateQuickPick.title =
                    "Select or specify the repo template to use";
                const templateItems = WELL_KNOWN_TEMPLATES.map((template) => {
                    return {
                        label: template.name,
                        description: template.template
                    };
                });
                templateQuickPick.buttons = [vscode_1.QuickInputButtons.Back];
                templateQuickPick.items = templateItems;
                templateQuickPick.onDidTriggerButton((e) => vscode_1.commands.executeCommand(`${constants_1.EXTENSION_NAME}.openRepository`));
                templateQuickPick.onDidChangeValue(() => {
                    if (templateQuickPick.value) {
                        templateQuickPick.items = [
                            { label: templateQuickPick.value },
                            ...templateItems
                        ];
                    }
                    else {
                        templateQuickPick.items = templateItems;
                    }
                });
                templateQuickPick.onDidAccept(async () => {
                    templateQuickPick.hide();
                    const template = templateQuickPick.selectedItems[0].description ||
                        templateQuickPick.selectedItems[0].label;
                    if (template) {
                        const repoName = await vscode_1.window.showInputBox({
                            prompt: "Specify the name of the repository to create"
                        });
                        if (!repoName) {
                            return;
                        }
                        await (0, utils_1.withProgress)(`Creating repository...`, async () => {
                            const { full_name } = await (0, actions_1.createRepositoryFromTemplate)(template, repoName, response === CREATE_PRIVATE_TEMPLATE_REPO_RESPONSE);
                            // When immediately querying a new template repo, the default
                            // branch can momentarily be incorrect. So we need to wait
                            // for just a bit, before trying to actually open it.
                            // TODO: Look into whether there's a better fix
                            await new Promise((resolve) => setTimeout(resolve, 2000));
                            await (0, actions_1.openRepo)(full_name, true);
                        });
                    }
                });
                templateQuickPick.show();
            }
            else {
                await (0, actions_1.openRepo)(response, true);
            }
        });
        quickPick.show();
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.closeRepository`, async (targetNode, multiSelectNodes) => {
        const nodes = multiSelectNodes || [targetNode];
        for (const node of nodes) {
            await (0, actions_1.closeRepo)(node.repo.name, node.repo.branch);
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.copyRepositoryUrl`, async (node) => {
        const url = getGitHubUrl(node.repo.name, node.repo.branch, node.repo.defaultBranch);
        vscode_1.env.clipboard.writeText(url);
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.copyRepositoryFileUrl`, async (node) => {
        const url = getGitHubUrl(node.repo.name, node.repo.branch, node.repo.defaultBranch, node.file.path);
        vscode_1.env.clipboard.writeText(url);
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.openRepositoryInBrowser`, async (node) => {
        const url = getGitHubUrl(node.repo.name, node.repo.branch, node.repo.defaultBranch);
        vscode_1.env.openExternal(vscode_1.Uri.parse(url));
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.openRepositoryFileInBrowser`, async (node) => {
        const url = getGitHubUrl(node.repo.name, node.repo.branch, node.repo.defaultBranch, node.file.path);
        vscode_1.env.openExternal(vscode_1.Uri.parse(url));
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.addRepositoryFile`, async (node) => {
        const path = await vscode_1.window.showInputBox({
            prompt: "Enter the path of the file you'd like to create (e.g. foo.js, bar/baz.md)"
        });
        if (path) {
            const filePath = node instanceof nodes_1.RepositoryFileNode
                ? `${node.file.path}/${path}`
                : path;
            await (0, utils_1.withProgress)("Adding new file...", () => (0, actions_1.addRepoFile)(node.repo.name, node.repo.branch, filePath));
            (0, utils_2.openRepoDocument)(node.repo.name, filePath);
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.duplicateRepositoryFile`, async (node) => {
        const extension = path.extname(node.file.path);
        const rootFileName = node.file.path.replace(extension, "");
        const duplicateFileName = `${rootFileName} - Copy${extension}`;
        const filePath = await vscode_1.window.showInputBox({
            placeHolder: "Specify the name of the new duplicated file",
            value: duplicateFileName
        });
        if (!filePath) {
            return;
        }
        await (0, utils_1.withProgress)("Duplicating file...", async () => {
            const uri = fileSystem_1.RepoFileSystemProvider.getFileUri(node.repo.name, node.file.path);
            const contents = await vscode_1.workspace.fs.readFile(uri);
            return (0, actions_1.addRepoFile)(node.repo.name, node.repo.branch, filePath, Buffer.from(contents).toString("base64"));
        });
        (0, utils_2.openRepoDocument)(node.repo.name, filePath);
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.uploadRepositoryFile`, async (node) => {
        const files = await vscode_1.window.showOpenDialog({
            canSelectMany: true,
            openLabel: "Upload"
        });
        if (files) {
            (0, utils_1.withProgress)("Uploading file(s)...", () => Promise.all(files.map((file) => {
                const fileName = path.basename(file.path);
                const content = fs.readFileSync(new url_1.URL(file.toString()));
                const filePath = node instanceof nodes_1.RepositoryFileNode
                    ? `${node.file.path}/${fileName}`
                    : fileName;
                return vscode_1.workspace.fs.writeFile(fileSystem_1.RepoFileSystemProvider.getFileUri(node.repo.name, filePath), content);
            })));
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.cloneManagedRepository`, async (node) => {
        // TODO: Add support for branches
        const url = `https://github.com/${node.repo.name}.git`;
        vscode_1.commands.executeCommand("git.clone", url);
    }));
    async function deleteTreeNode(node) {
        const fileType = node.file.isDirectory ? "directory" : "file";
        if (await vscode_1.window.showInformationMessage(`Are you sure you want to delete the "${node.file.name}" ${fileType}?`, "Delete")) {
            return (0, utils_1.withProgress)(`Deleting ${fileType}...`, async () => {
                const uri = fileSystem_1.RepoFileSystemProvider.getFileUri(node.repo.name, node.file.path);
                return vscode_1.workspace.fs.delete(uri);
            });
        }
    }
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.deleteRepositoryDirectory`, deleteTreeNode), vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.deleteRepositoryFile`, deleteTreeNode));
    async function renameTreeNode(node) {
        const fileType = node.file.isDirectory ? "directory" : "file";
        const response = await vscode_1.window.showInputBox({
            prompt: `Specify the new name of the ${fileType}`,
            value: node.file.path
        });
        if (response && response !== node.file.path) {
            await (0, utils_1.withProgress)(`Renaming ${fileType}`, async () => {
                const fileUri = fileSystem_1.RepoFileSystemProvider.getFileUri(node.repo.name, node.file.path);
                const newFileUri = fileSystem_1.RepoFileSystemProvider.getFileUri(node.repo.name, response);
                return vscode_1.workspace.fs.rename(fileUri, newFileUri);
            });
        }
    }
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.renameRepositoryDirectory`, renameTreeNode), vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.renameRepositoryFile`, renameTreeNode));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.refreshRepositories`, actions_1.refreshRepositories));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.deleteRepositoryBranch`, async (node) => {
        if (await vscode_1.window.showInformationMessage(`Are you sure you want to delete the "${node.repo.branch}" branch?`, "Delete branch")) {
            await (0, utils_1.withProgress)("Deleting branch...", async () => {
                await (0, actions_1.deleteBranch)(node.repo.name, node.repo.branch);
                await (0, actions_1.closeRepo)(node.repo.name, node.repo.branch);
                await (0, actions_1.openRepo)(node.repo.name);
            });
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.mergeRepositoryBranch`, async (node) => {
        const response = await vscode_1.window.showInputBox({
            prompt: "Specify a description of your changes",
            value: `Merging ${node.repo.branch}`
        });
        await (0, utils_1.withProgress)("Merging branch...", async () => {
            await (0, actions_1.rebaseBranch)(node.repo.name, node.repo.branch, response, node.repo.defaultBranch);
            await (0, actions_1.closeRepo)(node.repo.name, node.repo.branch);
            await (0, actions_1.openRepo)(node.repo.name);
        });
    }));
    const CREATE_BRANCH_RESPONSE = "$(add) Create new branch";
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.switchRepositoryBranch`, async (node) => {
        const quickPick = vscode_1.window.createQuickPick();
        quickPick.title = "Select the branch you'd like to manage";
        quickPick.placeholder = "Loading branches...";
        quickPick.busy = true;
        quickPick.show();
        const branches = (await (0, actions_1.getBranches)(node.repo.name))
            .sort()
            .filter((branch) => branch.name !== node.repo.branch);
        quickPick.items = [
            {
                label: CREATE_BRANCH_RESPONSE,
                alwaysShow: true
            },
            ...branches.map((branch) => ({
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
                const user = await (0, auth_1.getCurrentUser)();
                const date = moment().format("L");
                const newBranch = await vscode_1.window.showInputBox({
                    prompt: "Specify the name of the branch",
                    value: `${user}/${date}`
                });
                if (newBranch) {
                    await (0, utils_1.withProgress)("Creating branch...", async () => {
                        await (0, actions_1.createBranch)(node.repo.name, newBranch, node.repo.latestCommit);
                        await (0, actions_1.closeRepo)(node.repo.name, node.repo.branch);
                        await (0, actions_1.openRepo)(`${node.repo.name}#${newBranch}`);
                    });
                }
            }
            else {
                await (0, actions_1.closeRepo)(node.repo.name, node.repo.branch);
                await (0, actions_1.openRepo)(`${node.repo.name}#${branch}`);
            }
        });
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.deleteRepository`, async (node) => {
        if (!store_1.store.canDeleteRepos) {
            const response = await vscode_1.window.showInformationMessage("In order for GistPad to delete repos on your behalf, you need to authorize it.", "Authorize");
            if (!response) {
                return;
            }
            const authorized = await (0, auth_1.elevateSignin)();
            if (!authorized) {
                return;
            }
        }
        if (await vscode_1.window.showInformationMessage(`Are you sure you want to delete the "${node.repo.name}" repository?`, "Delete repository")) {
            try {
                await (0, utils_1.withProgress)("Deleting repository...", async () => {
                    await (0, actions_1.deleteRepository)(node.repo.name);
                    await (0, actions_1.closeRepo)(node.repo.name, node.repo.branch);
                });
            }
            catch (e) {
                if (await vscode_1.window.showErrorMessage("You don't have permission to delete this repository. Would you like to stop managing it?", "Stop managing")) {
                    await (0, actions_1.closeRepo)(node.repo.name, node.repo.branch);
                }
            }
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.openRepositorySwing`, async (node) => {
        const uri = fileSystem_1.RepoFileSystemProvider.getFileUri(node.repo.name);
        const extension = vscode_1.extensions.getExtension("codespaces-contrib.codeswing");
        if (extension.isActive) {
            await (extension === null || extension === void 0 ? void 0 : extension.activate());
        }
        extension === null || extension === void 0 ? void 0 : extension.exports.openSwing(uri);
    }));
}
//# sourceMappingURL=commands.js.map