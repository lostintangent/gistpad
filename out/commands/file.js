"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFileCommands = void 0;
const path = require("path");
const vscode_1 = require("vscode");
const constants_1 = require("../constants");
const store_1 = require("../store");
const auth_1 = require("../store/auth");
const nodes_1 = require("../tree/nodes");
const uriHandler_1 = require("../uriHandler");
const utils_1 = require("../utils");
function registerFileCommands(context) {
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.addFile`, async (node) => {
        await (0, auth_1.ensureAuthenticated)();
        const fileName = await vscode_1.window.showInputBox({
            prompt: "Enter the files name(s) to add to the gist (can be a comma-separated list)",
            placeHolder: "foo.md"
        });
        if (fileName) {
            await (0, utils_1.withProgress)("Adding file(s)...", async () => {
                const fileUris = fileName.split(",").map(fileName => (0, utils_1.fileNameToUri)(node.gist.id, fileName));
                const emptyBuffer = (0, utils_1.stringToByteArray)("");
                await Promise.all(fileUris.map(uri => vscode_1.workspace.fs.writeFile(uri, emptyBuffer)));
                fileUris.reverse().forEach(uri => (0, utils_1.openGistFile)(uri));
            });
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.copyFileContents`, async (node) => {
        const contents = await vscode_1.workspace.fs.readFile((0, utils_1.fileNameToUri)(node.gistId, node.file.filename));
        await vscode_1.env.clipboard.writeText((0, utils_1.byteArrayToString)(contents));
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.copyGistPadFileUrl`, async (nodeOrUri) => {
        let details;
        if (nodeOrUri instanceof nodes_1.GistFileNode) {
            details = { gistId: nodeOrUri.gistId, file: nodeOrUri.file.filename };
        }
        else {
            const { gistId, file } = (0, utils_1.getGistDetailsFromUri)((0, utils_1.encodeDirectoryUri)(nodeOrUri));
            details = { gistId, file };
        }
        const url = details.file.endsWith(".md")
            ? (0, uriHandler_1.createGistPadWebUrl)(details.gistId, details.file)
            : (0, uriHandler_1.createGistPadOpenUrl)(details.gistId, details.file);
        await vscode_1.env.clipboard.writeText(url);
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.copyFileUrl`, async (nodeOrUri) => {
        let url;
        if (nodeOrUri instanceof nodes_1.GistFileNode) {
            url = nodeOrUri.file.raw_url;
        }
        else {
            const { gistId, file } = (0, utils_1.getGistDetailsFromUri)((0, utils_1.encodeDirectoryUri)(nodeOrUri));
            const gist = store_1.store.gists.find((gist) => gist.id === gistId);
            url = gist.files[file].raw_url;
        }
        await vscode_1.env.clipboard.writeText(url);
    }));
    const DELETE_RESPONSE = "Delete";
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.deleteFile`, async (targetNode, multiSelectNodes) => {
        var _a;
        await (0, auth_1.ensureAuthenticated)();
        let uris;
        let fileLabel;
        if (targetNode instanceof nodes_1.GistFileNode) {
            uris = (multiSelectNodes || [targetNode]).map((node) => (0, utils_1.fileNameToUri)(node.gistId, node.file.filename));
            fileLabel = (_a = targetNode.label) === null || _a === void 0 ? void 0 : _a.toString();
        }
        else {
            uris = [targetNode];
            fileLabel = path.basename(targetNode.toString());
        }
        const suffix = multiSelectNodes && !("editorIndex" in multiSelectNodes) // TODO: Remove this hack
            ? "selected files"
            : `"${fileLabel}" file`;
        const response = await vscode_1.window.showInformationMessage(`Are you sure you want to delete the ${suffix}?`, DELETE_RESPONSE);
        if (response !== DELETE_RESPONSE) {
            return;
        }
        await (0, utils_1.withProgress)("Deleting file(s)...", () => {
            return Promise.all(uris.map((uri) => {
                vscode_1.workspace.fs.delete(uri);
            }));
        });
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.duplicateFile`, async (node) => {
        var _a;
        const extension = path.extname(node.file.filename);
        const rootFileName = (_a = node.file.filename) === null || _a === void 0 ? void 0 : _a.replace(extension, "");
        const duplicateFileName = `${rootFileName} - Copy${extension}`;
        const file = await vscode_1.window.showInputBox({
            placeHolder: "Specify the name of the new duplicated file",
            value: (0, utils_1.decodeDirectoryName)(duplicateFileName)
        });
        if (!file) {
            return;
        }
        (0, utils_1.withProgress)("Duplicating file...", async () => {
            const contents = await vscode_1.workspace.fs.readFile((0, utils_1.fileNameToUri)(node.gistId, node.file.filename));
            return vscode_1.workspace.fs.writeFile((0, utils_1.fileNameToUri)(node.gistId, file), contents);
        });
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.openGistFile`, (uri) => (0, utils_1.openGistFile)(uri, false)));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.renameFile`, async (nodeOrUri) => {
        await (0, auth_1.ensureAuthenticated)();
        let gistId, fileName;
        if (nodeOrUri instanceof nodes_1.GistFileNode) {
            gistId = nodeOrUri.gistId;
            fileName = (0, utils_1.decodeDirectoryName)(nodeOrUri.file.filename);
        }
        else {
            const details = (0, utils_1.getGistDetailsFromUri)(nodeOrUri);
            gistId = details.gistId;
            fileName = details.file;
        }
        const newFilename = await vscode_1.window.showInputBox({
            prompt: "Specify the new name for this file",
            value: fileName
        });
        if (newFilename) {
            (0, utils_1.withProgress)("Renaming file...", async () => vscode_1.workspace.fs.rename((0, utils_1.fileNameToUri)(gistId, fileName), (0, utils_1.fileNameToUri)(gistId, newFilename)));
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.uploadFileToGist`, async (node) => {
        await (0, auth_1.ensureAuthenticated)();
        const files = await vscode_1.window.showOpenDialog({
            canSelectMany: true,
            openLabel: "Upload"
        });
        if (files) {
            (0, utils_1.withProgress)("Uploading file(s)...", () => Promise.all(files.map(async (file) => {
                const fileName = path.basename(file.path);
                const content = await vscode_1.workspace.fs.readFile(file);
                return vscode_1.workspace.fs.writeFile((0, utils_1.fileNameToUri)(node.gist.id, fileName), content);
            })));
        }
    }));
}
exports.registerFileCommands = registerFileCommands;
//# sourceMappingURL=file.js.map