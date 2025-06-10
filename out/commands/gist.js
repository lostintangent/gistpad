"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGistCommands = registerGistCommands;
const mobx_1 = require("mobx");
const url_1 = require("url");
const vscode_1 = require("vscode");
const constants_1 = require("../constants");
const api_1 = require("../fileSystem/api");
const git_1 = require("../fileSystem/git");
const actions_1 = require("../repos/store/actions");
const store_1 = require("../store");
const actions_2 = require("../store/actions");
const auth_1 = require("../store/auth");
const nodes_1 = require("../tree/nodes");
const uriHandler_1 = require("../uriHandler");
const utils_1 = require("../utils");
const isBinaryPath = require("is-binary-path");
const path = require("path");
const GIST_NAME_PATTERN = /(\/)?(?<owner>([a-z\d]+-)*[a-z\d]+)\/(?<id>[^\/]+)$/i;
const newPublicGist = newGistInternal.bind(null, true);
const newSecretGist = newGistInternal.bind(null, false);
async function newGistInternal(isPublic = true, description = "") {
    await (0, auth_1.ensureAuthenticated)();
    const title = "Create new " + (isPublic ? "" : "secret ") + "gist";
    const totalSteps = 2;
    let currentStep = 1;
    const descriptionInputBox = vscode_1.window.createInputBox();
    descriptionInputBox.title = title;
    descriptionInputBox.prompt = "Enter an optional description for the new Gist";
    descriptionInputBox.step = currentStep++;
    descriptionInputBox.totalSteps = totalSteps;
    descriptionInputBox.value = description;
    descriptionInputBox.valueSelection = [0, 0];
    descriptionInputBox.onDidAccept(() => {
        descriptionInputBox.hide();
        const description = descriptionInputBox.value;
        const fileNameInputBox = vscode_1.window.createInputBox();
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
            return vscode_1.window.withProgress({ location: vscode_1.ProgressLocation.Notification, title: "Creating Gist..." }, () => {
                const files = fileName
                    .split(",")
                    .map((filename) => ({ filename: (0, utils_1.encodeDirectoryName)(filename) }));
                return (0, actions_2.newGist)(files, isPublic, description);
            });
        });
        fileNameInputBox.show();
    });
    descriptionInputBox.show();
}
async function syncGistFileInternal(textEditor) {
    await (0, auth_1.ensureAuthenticated)();
    await vscode_1.window.withProgress({
        location: vscode_1.ProgressLocation.Notification,
        title: "Syncing changes with gist..."
    }, async () => {
        const uri = textEditor.document.uri;
        const { gistId } = (0, utils_1.getGistDetailsFromUri)(uri);
        if (!(0, utils_1.isOwnedGist)(gistId)) {
            throw new Error("You can't sync a Gist you don't own");
        }
        const content = textEditor.document.getText();
        const filename = path.basename(uri.path);
        await (0, api_1.updateGistFiles)(gistId, [
            [filename, { content }],
        ]);
        store_1.store.unsyncedFiles.delete(uri.toString());
    })
        .then(() => { }, (err) => {
        // TODO how to close the progress dialog first?
        const message = err instanceof Error ? err.message : "Unknown error occurred";
        vscode_1.window.showErrorMessage(`Failed to sync file: ${message}`);
    });
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
const getGistIdFromUrl = (gistUrl) => {
    const url = new url_1.URL(gistUrl);
    const { pathname } = url;
    const pathnameComponents = pathname.split("/");
    const id = pathnameComponents[pathnameComponents.length - 1];
    return id;
};
async function openGistInternal(options = { openAsWorkspace: false, forceNewWindow: false }) {
    const { node, openAsWorkspace, forceNewWindow, gistUrl, gistId } = options;
    if (gistUrl || gistId) {
        const id = gistId ? gistId : getGistIdFromUrl(gistUrl); // (!) since the `gistId` is not set, means the `gistUrl` is set
        return (0, utils_1.openGist)(id, !!openAsWorkspace, !!forceNewWindow);
    }
    else if (node) {
        return (0, utils_1.openGist)(node.gist.id, !!openAsWorkspace, !!forceNewWindow);
    }
    let gistItems = [];
    if (store_1.store.isSignedIn) {
        const gists = store_1.store.gists;
        if (gists.length > 0) {
            gistItems = gists.map((gist) => {
                return {
                    label: (0, utils_1.getGistLabel)(gist),
                    description: (0, utils_1.getGistDescription)(gist),
                    id: gist.id
                };
            });
        }
        gistItems.push(...CREATE_GIST_ITEMS);
    }
    else {
        gistItems = [{ label: SIGN_IN_ITEM }];
    }
    const list = vscode_1.window.createQuickPick();
    list.placeholder = "Select the gist to open, or specify a gist URL or ID";
    list.items = gistItems;
    list.ignoreFocusOut = true;
    list.onDidChangeValue((gistId) => {
        list.items = gistId
            ? [{ label: gistId, id: gistId }, ...gistItems]
            : gistItems;
    });
    const clipboardValue = await vscode_1.env.clipboard.readText();
    if (GIST_NAME_PATTERN.test(clipboardValue)) {
        list.value = clipboardValue;
        list.items = [{ label: clipboardValue, id: clipboardValue }, ...gistItems];
    }
    list.onDidAccept(async () => {
        const gist = list.selectedItems[0] || list.value;
        list.hide();
        // The "id" property is only set on list items
        // that are added in response to user input, as
        // opposed to being part of the list of owned gists.
        if (gist.id) {
            let gistId = gist.id;
            if (GIST_NAME_PATTERN.test(gist.id)) {
                gistId = GIST_NAME_PATTERN.exec(gist.id).groups.id;
            }
            (0, utils_1.openGist)(gistId, !!openAsWorkspace);
        }
        else {
            switch (gist.label) {
                case SIGN_IN_ITEM:
                    await (0, auth_1.signIn)();
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
    await (0, auth_1.ensureAuthenticated)();
    const gists = await (0, actions_2.starredGists)();
    const items = (0, utils_1.sortGists)(gists).map((g) => ({
        label: (0, utils_1.getGistLabel)(g),
        description: (0, utils_1.getGistDescription)(g),
        id: g.id
    }));
    if (items.length === 0) {
        const message = `You don't have any starred Gists`;
        return vscode_1.window.showInformationMessage(message);
    }
    const selected = await vscode_1.window.showQuickPick(items, {
        placeHolder: "Select the Gist you'd like to open"
    });
    if (selected) {
        (0, utils_1.openGistFiles)(selected.id);
    }
}
async function registerGistCommands(context) {
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.changeGistDescription`, async (node) => {
        await (0, auth_1.ensureAuthenticated)();
        if (node) {
            // If this is an archived gist, we need to remove the "archived" prefix
            const isArchived = (0, utils_1.isArchivedGist)(node.gist);
            const description = isArchived
                ? node.gist.description.replace(" [Archived]", "")
                : node.gist.description;
            let newDescription = await vscode_1.window.showInputBox({
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
            await (0, actions_2.changeDescription)(node.gist.id, newDescription);
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.cloneRepository`, async (node) => {
        vscode_1.commands.executeCommand("git.clone", node.gist.git_pull_url);
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.copyGistUrl`, async (node) => {
        // Note: The "html_url" property doesn't include the Gist's owner
        // in it, and the API doesn't support that URL format
        const url = `https://gist.github.com/${node.gist.owner.login}/${node.gist.id}`;
        vscode_1.env.clipboard.writeText(url);
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.copyGistPadUrl`, async (node) => {
        const url = node.gist.type === "note"
            ? (0, uriHandler_1.createGistPadWebUrl)(node.gist.id)
            : (0, uriHandler_1.createGistPadOpenUrl)(node.gist.id);
        vscode_1.env.clipboard.writeText(url);
    }));
    const DELETE_RESPONSE = "Delete";
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.deleteGist`, async (targetNode, multiSelectNodes) => {
        await (0, auth_1.ensureAuthenticated)();
        if (targetNode) {
            const suffix = multiSelectNodes
                ? "selected gists"
                : `"${targetNode.label}" gist`;
            const response = await vscode_1.window.showInformationMessage(`Are you sure you want to delete the ${suffix}?`, DELETE_RESPONSE);
            if (response !== DELETE_RESPONSE) {
                return;
            }
            const nodes = multiSelectNodes || [targetNode];
            await (0, mobx_1.runInAction)(async () => {
                for (const node of nodes) {
                    await (0, actions_2.deleteGist)(node.gist.id);
                    await (0, utils_1.closeGistFiles)(node.gist);
                }
            });
        }
        else if ((0, utils_1.isGistWorkspace)()) {
            const response = await vscode_1.window.showInformationMessage("Are you sure you want to delete the opened Gist?", DELETE_RESPONSE);
            if (response !== DELETE_RESPONSE) {
                return;
            }
            const gistId = (0, utils_1.getGistWorkspaceId)();
            (0, actions_2.deleteGist)(gistId);
            vscode_1.commands.executeCommand("workbench.action.closeFolder");
        }
        else {
            const gists = store_1.store.gists;
            if (gists.length === 0) {
                return vscode_1.window.showInformationMessage("You don't have any Gists to delete");
            }
            const items = gists.map((g) => ({
                label: (0, utils_1.getGistLabel)(g),
                description: (0, utils_1.getGistDescription)(g),
                id: g.id
            }));
            const gist = await vscode_1.window.showQuickPick(items, {
                placeHolder: "Select the Gist to delete..."
            });
            if (!gist) {
                return;
            }
            await (0, utils_1.withProgress)("Deleting gist...", async () => {
                await (0, actions_2.deleteGist)(gist.id);
                await (0, utils_1.closeGistFiles)(gists.find((gist) => gist.id === gist.id));
            });
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.forkGist`, async (node) => {
        await (0, auth_1.ensureAuthenticated)();
        let gistId;
        if (node) {
            gistId = node.gist.id;
        }
        else if ((0, utils_1.isGistWorkspace)()) {
            gistId = (0, utils_1.getGistWorkspaceId)();
        }
        else {
            // TODO: Display the list of starred gists
            gistId = await vscode_1.window.showInputBox({
                prompt: "Enter the Gist ID to fork"
            });
            if (!gistId) {
                return;
            }
        }
        await vscode_1.window.withProgress({ location: vscode_1.ProgressLocation.Notification, title: "Forking Gist..." }, () => (0, actions_2.forkGist)(gistId));
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.viewForks`, async (node) => {
        if (node) {
            const forks = await (0, actions_2.getForks)(node.gist.id);
            if (forks.length === 0) {
                return vscode_1.window.showInformationMessage("This gist doesn't have any forks.");
            }
            const getDescription = (gist) => {
                const isModified = gist.created_at !== gist.updated_at;
                return `${(0, utils_1.getGistDescription)(gist)}${isModified ? " $(edit)" : ""}`;
            };
            const items = (0, utils_1.sortGists)(forks).map((g) => ({
                label: g.owner.login,
                description: getDescription(g),
                id: g.id
            }));
            const selected = await vscode_1.window.showQuickPick(items, {
                placeHolder: "Select the forked gist you'd like to open..."
            });
            if (selected) {
                (0, utils_1.openGistFiles)(selected.id);
            }
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.newPublicGist`, () => newPublicGist()));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.newSecretGist`, () => newSecretGist()));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.newGistFromTag`, (node) => {
        const description = ` #${node.label}`;
        newSecretGist(description);
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.openGist`, (node) => {
        // We expose the "Open Gist" command on the "Your Gists" node
        // for productivity purposes, but that node doesn't contain
        // a gist, and so if the user is coming in from there, then
        // don't pass on the tree node object to the open gist method.
        const gistNode = node instanceof nodes_1.GistNode ||
            node instanceof nodes_1.StarredGistNode ||
            node instanceof nodes_1.FollowedUserGistNode
            ? node
            : undefined;
        openGistInternal({ node: gistNode });
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.openGistInBrowser`, async (node) => {
        let url = node.gist.html_url;
        if (node.gist.type === "note") {
            url = (0, uriHandler_1.createGistPadWebUrl)(node.gist.id);
        }
        vscode_1.env.openExternal(vscode_1.Uri.parse(url));
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.openGistInNbViewer`, async (node) => {
        const url = `https://nbviewer.jupyter.org/gist/${node.gist.owner.login}/${node.gist.id}`;
        vscode_1.env.openExternal(vscode_1.Uri.parse(url));
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.openGistWorkspace`, (node) => {
        openGistInternal({ node, openAsWorkspace: true });
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.openGistNewWindow`, (node) => {
        openGistInternal({ node, openAsWorkspace: true, forceNewWindow: true });
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.refreshGists`, actions_2.refreshGists));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.sortGistsAlphabetically`, () => {
        store_1.store.sortOrder = store_1.SortOrder.alphabetical;
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.sortGistsByUpdatedTime`, () => {
        store_1.store.sortOrder = store_1.SortOrder.updatedTime;
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.groupGists`, () => {
        store_1.store.groupType = store_1.GroupType.tagAndType;
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.ungroupGists`, () => {
        store_1.store.groupType = store_1.GroupType.none;
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.starredGists`, starredGistsInternal));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.exportToRepo`, async (node) => {
        if (!store_1.store.canCreateRepos) {
            return vscode_1.window.showErrorMessage('The token you used to login doesn\'t include the "repo" scope.');
        }
        const repoName = await vscode_1.window.showInputBox({
            prompt: "Specify the name of the repository to create",
            value: node.gist.description || ""
        });
        if (!repoName) {
            return;
        }
        let repoUri, fullName;
        await (0, utils_1.withProgress)("Exporting to repository...", async () => {
            const api = await (0, auth_1.getApi)();
            const name = repoName.replace(/\s/g, "-").replace(/[^\w\d-_]/g, "");
            const response = await api.post("/user/repos", {
                name,
                description: node.gist.description,
                private: !node.gist.public
            });
            repoUri = vscode_1.Uri.parse(response.body.html_url);
            fullName = `${store_1.store.login}/${name}`;
            // TODO: Accomodate scenarios where the end-user
            // doesn't have Git installed
            await (0, git_1.exportToRepo)(node.gist.id, name);
            await (0, actions_1.openRepo)(fullName, true);
        });
        if (await vscode_1.window.showInformationMessage(`Gist successfully exported to "${fullName}".`, "Open in browser")) {
            // @ts-ignore
            return vscode_1.env.openExternal(repoUri);
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.unstarGist`, async (targetNode, multiSelectNodes) => {
        await (0, auth_1.ensureAuthenticated)();
        const nodes = multiSelectNodes || [targetNode];
        for (const node of nodes) {
            (0, actions_2.unstarGist)(node.gist.id);
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.starGist`, async (targetNode, multiSelectNodes) => {
        await (0, auth_1.ensureAuthenticated)();
        const nodes = multiSelectNodes || [targetNode];
        for (const node of nodes) {
            (0, actions_2.starGist)(node.gist);
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.duplicateGist`, async (node) => {
        await (0, auth_1.ensureAuthenticated)();
        const description = await vscode_1.window.showInputBox({
            prompt: "Enter an optional description for the new Gist",
            value: node.gist.description
        });
        await vscode_1.window.withProgress({
            location: vscode_1.ProgressLocation.Notification,
            title: "Duplicating Gist..."
        }, async () => {
            const includesBinaryFile = Object.keys(node.gist.files).some(isBinaryPath);
            if (includesBinaryFile) {
                // Create a new gist with a "placeholder" file,
                // since gists aren't allowed to be empty.
                const gist = await (0, actions_2.newGist)([{ filename: "placeholder", content: "" }], node.gist.public, description, false);
                await (0, git_1.duplicateGist)(node.gist.id, gist.id);
                // Since the created gist doesn't include the files
                // that were pushed via git, we need to refresh it
                // in our local Mobx store and then update the tags
                await (0, actions_2.refreshGist)(gist.id);
                await (0, utils_1.updateGistTags)(gist);
            }
            else {
                const files = [];
                for (const filename of Object.keys(node.gist.files)) {
                    const content = (0, utils_1.byteArrayToString)(await vscode_1.workspace.fs.readFile((0, utils_1.fileNameToUri)(node.gist.id, filename)));
                    files.push({
                        filename,
                        content
                    });
                }
                await (0, actions_2.newGist)(files, node.gist.public, description);
            }
        });
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.archiveGist`, async (node) => {
        await (0, auth_1.ensureAuthenticated)();
        await (0, utils_1.withProgress)("Archiving gist...", () => (0, actions_2.archiveGist)(node.gist.id));
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.unarchiveGist`, async (node) => {
        await (0, auth_1.ensureAuthenticated)();
        await (0, utils_1.withProgress)("Unarchiving gist...", () => (0, actions_2.unarchiveGist)(node.gist.id));
    }));
    context.subscriptions.push(vscode_1.commands.registerTextEditorCommand(`${constants_1.EXTENSION_NAME}.syncGistFile`, syncGistFileInternal));
}
//# sourceMappingURL=gist.js.map