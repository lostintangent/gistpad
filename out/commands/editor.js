"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptForGistSelection = promptForGistSelection;
exports.registerEditorCommands = registerEditorCommands;
const pasteImage_1 = require("@abstractions/images/pasteImage");
const path = require("path");
const vscode_1 = require("vscode");
const constants_1 = require("../constants");
const store_1 = require("../store");
const actions_1 = require("../store/actions");
const auth_1 = require("../store/auth");
const nodes_1 = require("../tree/nodes");
const utils_1 = require("../utils");
async function askForFileName() {
    return vscode_1.window.showInputBox({
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
async function newGistWithFiles(isPublic, files) {
    const description = await vscode_1.window.showInputBox({
        prompt: "Enter an optional description for the new Gist"
    });
    vscode_1.window.withProgress({ location: vscode_1.ProgressLocation.Notification, title: "Creating Gist..." }, () => {
        return (0, actions_1.newGist)(files, isPublic, description, false);
    });
}
async function promptForGistSelection(files) {
    const gistItems = store_1.store.gists.map((gist) => {
        return {
            label: (0, utils_1.getGistLabel)(gist),
            description: (0, utils_1.getGistDescription)(gist),
            id: gist.id
        };
    });
    gistItems.unshift(...CREATE_GIST_ITEMS);
    const list = vscode_1.window.createQuickPick();
    list.placeholder = "Specify the gist you'd like to add the file(s) to";
    list.items = gistItems;
    list.onDidAccept(async () => {
        const gist = list.selectedItems[0];
        list.hide();
        if (gist.id) {
            vscode_1.window.withProgress({ location: vscode_1.ProgressLocation.Notification, title: "Adding file(s)..." }, () => Promise.all(files.map((file) => vscode_1.workspace.fs.writeFile((0, utils_1.fileNameToUri)(gist.id, file.filename), (0, utils_1.stringToByteArray)(file.content)))));
        }
        else {
            const isPublic = gist.label === CREATE_PUBLIC_GIST_ITEM;
            newGistWithFiles(isPublic, files);
        }
    });
    list.show();
}
function registerEditorCommands(context) {
    // This command can be called from four different contexts:
    // 1) Right-clicking a file in the "Explorer" tree (Uri)
    // 2) Right-clicking the editor tab of a file (Uri)
    // 3) Right-clicking a file in the "Gists" tree (GistFileNode)
    // 4) From the toolbar of the notebook editor
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.addFileToGist`, async (targetNode, multiSelectNodes) => {
        await (0, auth_1.ensureAuthenticated)();
        const nodes = multiSelectNodes && !("editorIndex" in multiSelectNodes)
            ? multiSelectNodes
            : [targetNode];
        const files = [];
        for (const node of nodes) {
            if (node instanceof nodes_1.GistFileNode) {
                // The command is being called as a response to
                // right-clicking a file node in the Gists tree
                files.push({
                    filename: node.file.filename,
                    content: (0, utils_1.byteArrayToString)(await vscode_1.workspace.fs.readFile((0, utils_1.fileNameToUri)(node.gistId, node.file.filename)))
                });
            }
            else {
                const uri = node instanceof vscode_1.Uri ? node : node.notebookEditor.notebookUri;
                // The command is being called as a response to
                // right-clicking a file node in the explorer
                // and/or right-clicking the editor tab
                files.push({
                    filename: path.basename(uri.path),
                    content: (0, utils_1.byteArrayToString)(await vscode_1.workspace.fs.readFile(uri))
                });
            }
        }
        promptForGistSelection(files);
    }));
    context.subscriptions.push(vscode_1.commands.registerTextEditorCommand(`${constants_1.EXTENSION_NAME}.addSelectionToGist`, async (editor) => {
        await (0, auth_1.ensureAuthenticated)();
        const filename = await askForFileName();
        if (!filename) {
            return;
        }
        const content = await editor.document.getText(editor.selection);
        promptForGistSelection([{ filename, content }]);
    }));
    context.subscriptions.push(vscode_1.commands.registerTextEditorCommand(`${constants_1.EXTENSION_NAME}.pasteGistFile`, async (editor) => {
        await (0, auth_1.ensureAuthenticated)();
        const gists = store_1.store.gists;
        const gistItems = store_1.store.gists.map((gist) => ({
            label: (0, utils_1.getGistLabel)(gist),
            description: (0, utils_1.getGistDescription)(gist),
            id: gist.id
        }));
        const selectedGist = await vscode_1.window.showQuickPick(gistItems, {
            placeHolder: "Select the Gist you'd like to paste a file from"
        });
        if (!selectedGist) {
            return;
        }
        const gist = gists.find((gist) => gist.id === selectedGist.id);
        const fileItems = Object.keys(gist.files).map(utils_1.decodeDirectoryName);
        let selectedFile;
        if (fileItems.length === 1) {
            selectedFile = fileItems[0];
        }
        else {
            selectedFile = await vscode_1.window.showQuickPick(fileItems, {
                placeHolder: "Select the file to paste from"
            });
            if (!selectedFile) {
                return;
            }
        }
        // TODO: Add support for pasting binary files
        // (or at least prevent it)
        const uri = (0, utils_1.fileNameToUri)(gist.id, selectedFile);
        const contents = (0, utils_1.byteArrayToString)(await vscode_1.workspace.fs.readFile(uri));
        editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, contents);
        });
    }));
    context.subscriptions.push(vscode_1.commands.registerTextEditorCommand(`${constants_1.EXTENSION_NAME}.pasteImage`, pasteImage_1.pasteImageCommand));
}
//# sourceMappingURL=editor.js.map