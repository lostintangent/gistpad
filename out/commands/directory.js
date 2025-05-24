"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDirectoryCommands = void 0;
const fs = require("fs");
const path = require("path");
const url_1 = require("url");
const vscode_1 = require("vscode");
const constants_1 = require("../constants");
const auth_1 = require("../store/auth");
const utils_1 = require("../utils");
function getDirectoryFiles(nodes) {
    return nodes.flatMap((node) => Object.keys(node.gist.files)
        .filter((file) => file.startsWith(`${node.directory}${constants_1.ENCODED_DIRECTORY_SEPARATOR}`))
        .map((file) => (0, utils_1.decodeDirectoryUri)((0, utils_1.fileNameToUri)(node.gist.id, file))));
}
function registerDirectoryCommands(context) {
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.addDirectoryFile`, async (node) => {
        await (0, auth_1.ensureAuthenticated)();
        const fileName = await vscode_1.window.showInputBox({
            prompt: "Enter the files name(s) to add to the directory (can be a comma-separated list)",
            placeHolder: "foo.md"
        });
        if (fileName) {
            await (0, utils_1.withProgress)("Adding file(s)...", () => {
                const fileNames = fileName.split(",");
                return Promise.all(fileNames.map((fileName) => {
                    return vscode_1.workspace.fs.writeFile((0, utils_1.fileNameToUri)(node.gist.id, `${node.directory}${constants_1.DIRECTORY_SEPARATOR}${fileName}`), (0, utils_1.stringToByteArray)(""));
                }));
            });
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.uploadFileToDirectory`, async (node) => {
        await (0, auth_1.ensureAuthenticated)();
        const files = await vscode_1.window.showOpenDialog({
            canSelectMany: true,
            openLabel: "Upload"
        });
        if (files) {
            (0, utils_1.withProgress)("Uploading file(s)...", () => Promise.all(files.map((file) => {
                const fileName = path.basename(file.path);
                const content = fs.readFileSync(new url_1.URL(file.toString()));
                const gistFileName = `${node.directory}${constants_1.DIRECTORY_SEPARATOR}${fileName}`;
                return vscode_1.workspace.fs.writeFile((0, utils_1.fileNameToUri)(node.gist.id, gistFileName), content);
            })));
        }
    }));
    const DELETE_RESPONSE = "Delete";
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.deleteDirectory`, async (targetNode, multiSelectNodes) => {
        await (0, auth_1.ensureAuthenticated)();
        const uris = getDirectoryFiles(multiSelectNodes || [targetNode]);
        const [promptSuffix, progressSuffix] = multiSelectNodes
            ? ["selected directories", "directories"]
            : [`"${targetNode.label}" directory`, "directory"];
        const response = await vscode_1.window.showInformationMessage(`Are you sure you want to delete the ${promptSuffix}?`, DELETE_RESPONSE);
        if (response !== DELETE_RESPONSE) {
            return;
        }
        await (0, utils_1.withProgress)(`Deleting ${progressSuffix}...`, () => {
            return Promise.all(uris.map((uri) => {
                vscode_1.workspace.fs.delete(uri);
            }));
        });
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.duplicateDirectory`, async (node) => {
        await (0, auth_1.ensureAuthenticated)();
        const directory = await vscode_1.window.showInputBox({
            placeHolder: "Specify the name of the new duplicated directory",
            value: `${node.directory} - Copy`
        });
        if (!directory) {
            return;
        }
        const uris = getDirectoryFiles([node]);
        await (0, utils_1.withProgress)(`Duplicating directory...`, () => Promise.all(uris.map(async (uri) => {
            const contents = await vscode_1.workspace.fs.readFile(uri);
            const duplicateFileName = `${directory}${constants_1.DIRECTORY_SEPARATOR}${path.basename(uri.path)}`;
            return vscode_1.workspace.fs.writeFile((0, utils_1.fileNameToUri)(node.gist.id, duplicateFileName), contents);
        })));
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.renameDirectory`, async (node) => {
        await (0, auth_1.ensureAuthenticated)();
        const newDirectoryName = await vscode_1.window.showInputBox({
            prompt: "Specify the new name for this directory",
            value: node.directory
        });
        if (newDirectoryName) {
            const uris = getDirectoryFiles([node]);
            // TODO: Enable renames to be buffered appropriately,
            // so that we don't have to run them sequentially like this
            await (0, utils_1.withProgress)(`Renaming directory...`, async () => {
                for (const uri of uris) {
                    const fileName = path.basename(uri.path);
                    const newFileName = `${newDirectoryName}${constants_1.DIRECTORY_SEPARATOR}${fileName}`;
                    const newUri = (0, utils_1.fileNameToUri)(node.gist.id, newFileName);
                    await vscode_1.workspace.fs.rename(uri, newUri);
                }
            });
        }
    }));
}
exports.registerDirectoryCommands = registerDirectoryCommands;
//# sourceMappingURL=directory.js.map