"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStatusBar = registerStatusBar;
const mobx_1 = require("mobx");
const vscode_1 = require("vscode");
const store_1 = require("../store");
function registerStatusBar() {
    const openTodayPageStatusBarItem = vscode_1.window.createStatusBarItem();
    openTodayPageStatusBarItem.command = "gistpad.openTodayPage";
    openTodayPageStatusBarItem.text = "$(calendar)";
    const addWikiPageStatusBarItem = vscode_1.window.createStatusBarItem();
    addWikiPageStatusBarItem.command = "gistpad.addWikiPage";
    addWikiPageStatusBarItem.text = "$(notebook)";
    (0, mobx_1.reaction)(() => [store_1.store.wiki], () => {
        vscode_1.commands.executeCommand("setContext", "gistpad:hasWiki", !!store_1.store.wiki);
        if (store_1.store.wiki) {
            openTodayPageStatusBarItem.tooltip = `GistPad: Open today page (${store_1.store.wiki.fullName})`;
            openTodayPageStatusBarItem.show();
            addWikiPageStatusBarItem.tooltip = `GistPad: Add Wiki Page (${store_1.store.wiki.fullName})`;
            addWikiPageStatusBarItem.show();
        }
        else {
            openTodayPageStatusBarItem.hide();
            addWikiPageStatusBarItem.hide();
        }
    });
}
//# sourceMappingURL=statusBar.js.map