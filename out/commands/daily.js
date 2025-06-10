"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDailyCommands = registerDailyCommands;
const vscode_1 = require("vscode");
const config = require("../config");
const constants_1 = require("../constants");
const store_1 = require("../store");
const actions_1 = require("../store/actions");
async function registerDailyCommands(context) {
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.openTodayNote`, actions_1.openTodayNote));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.openDailyTemplate`, actions_1.openDailyTemplate));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.hideDailyNotes`, () => {
        store_1.store.dailyNotes.show = false;
        config.set("dailyNotes.show", false);
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.clearDailyNotes`, async () => {
        const response = await vscode_1.window.showInformationMessage("Are you sure you want to clear your daily notes?", "Clear Notes");
        if (response) {
            (0, actions_1.clearDailyNotes)();
        }
    }));
}
//# sourceMappingURL=daily.js.map