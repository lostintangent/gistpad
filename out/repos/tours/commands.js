"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTourCommands = registerTourCommands;
const vscode_1 = require("vscode");
const constants_1 = require("../../constants");
const tour_1 = require("../../tour");
const fileSystem_1 = require("../fileSystem");
const store_1 = require("../store");
const actions_1 = require("./actions");
async function registerTourCommands(context) {
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.recordRepoCodeTour`, async (node) => {
        store_1.store.isInCodeTour = true;
        const uri = fileSystem_1.RepoFileSystemProvider.getFileUri(node.repo.name);
        (0, tour_1.recordTour)(uri);
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.startRepoCodeTour`, async (node) => {
        const [tours, workspaceRoot] = await (0, actions_1.loadRepoTours)(node.repo);
        if (await (0, tour_1.selectTour)(tours, workspaceRoot)) {
            store_1.store.isInCodeTour = true;
        }
    }));
}
//# sourceMappingURL=commands.js.map