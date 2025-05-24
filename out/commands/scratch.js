"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerScratchCommands = void 0;
const vscode_1 = require("vscode");
const config = require("../config");
const constants_1 = require("../constants");
const store_1 = require("../store");
const actions_1 = require("../store/actions");
async function registerScratchCommands(context) {
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.newScratchNote`, actions_1.newScratchNote));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.hideScratchNotes`, () => {
        store_1.store.scratchNotes.show = false;
        config.set("scratchNotes.show", false);
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.clearScratchNotes`, async () => {
        const response = await vscode_1.window.showInformationMessage("Are you sure you want to clear your scratch notes?", "Clear Notes");
        if (response) {
            (0, actions_1.clearScratchNotes)();
        }
    }));
}
exports.registerScratchCommands = registerScratchCommands;
//# sourceMappingURL=scratch.js.map