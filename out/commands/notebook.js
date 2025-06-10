"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerNotebookCommands = registerNotebookCommands;
const vscode = require("vscode");
const constants_1 = require("../constants");
const actions_1 = require("../store/actions");
const utils_1 = require("../utils");
const NOTEBOOK_FILE = "index.ipynb";
async function newNotebook(description) {
    const files = [
        {
            filename: NOTEBOOK_FILE
        }
    ];
    const gist = await (0, actions_1.newGist)(files, false, description, false);
    const notebookUri = (0, utils_1.fileNameToUri)(gist.id, NOTEBOOK_FILE);
    (0, utils_1.openGistFile)(notebookUri, false);
}
async function registerNotebookCommands(context) {
    context.subscriptions.push(vscode.commands.registerCommand(`${constants_1.EXTENSION_NAME}.newNotebook`, async () => {
        const description = await vscode.window.showInputBox({
            prompt: "Enter the description of the notebook"
        });
        if (!description) {
            return;
        }
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Creating notebook..."
        }, () => newNotebook(description));
    }));
}
//# sourceMappingURL=notebook.js.map