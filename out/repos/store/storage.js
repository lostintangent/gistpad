"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeStorage = exports.reposStorage = void 0;
const vscode_1 = require("vscode");
const extension_1 = require("../../extension");
const HASREPOS_CONTEXT = "gistpad:hasRepos";
const REPO_KEY = "gistpad.repos";
async function initializeStorage(context) {
    exports.reposStorage = {
        get repos() {
            extension_1.output === null || extension_1.output === void 0 ? void 0 : extension_1.output.appendLine(`Getting repos from global state = ${context.globalState.get(REPO_KEY, [])}`, extension_1.output === null || extension_1.output === void 0 ? void 0 : extension_1.output.messageType.Info);
            return context.globalState.get(REPO_KEY, []);
        },
        set repos(repos) {
            extension_1.output === null || extension_1.output === void 0 ? void 0 : extension_1.output.appendLine(`Setting repos to ${repos}`, extension_1.output === null || extension_1.output === void 0 ? void 0 : extension_1.output.messageType.Info);
            context.globalState.update(REPO_KEY, repos);
            vscode_1.commands.executeCommand("setContext", HASREPOS_CONTEXT, repos.length > 0);
        }
    };
    vscode_1.commands.executeCommand("setContext", HASREPOS_CONTEXT, exports.reposStorage.repos.length > 0);
}
exports.initializeStorage = initializeStorage;
//# sourceMappingURL=storage.js.map