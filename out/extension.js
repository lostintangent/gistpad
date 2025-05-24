"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = exports.output = void 0;
const vscode_1 = require("vscode");
const commands_1 = require("./commands");
const comments_1 = require("./comments");
const config = require("./config");
const fileSystem_1 = require("./fileSystem");
const output_1 = require("./output");
const repos_1 = require("./repos");
const markdownPreview_1 = require("./repos/wiki/markdownPreview");
const showcase_1 = require("./showcase");
const store_1 = require("./store");
const auth_1 = require("./store/auth");
const storage_1 = require("./store/storage");
const swings_1 = require("./swings");
const tree_1 = require("./tree");
const uriHandler_1 = require("./uriHandler");
async function activate(context) {
    (0, commands_1.registerCommands)(context);
    (0, uriHandler_1.registerProtocolHandler)();
    (0, fileSystem_1.registerFileSystemProvider)(store_1.store);
    (0, tree_1.registerTreeProvider)(store_1.store, context);
    (0, comments_1.registerCommentController)();
    (0, storage_1.initializeStorage)(context);
    (0, auth_1.initializeAuth)();
    (0, repos_1.registerRepoModule)(context);
    (0, swings_1.registerCodeSwingModule)(context);
    (0, showcase_1.registerShowcaseModule)(context);
    const keysForSync = ["followedUsers", "repos"].map((key) => `gistpad.${key}`);
    if (config.get("output")) {
        exports.output = new output_1.Output();
    }
    exports.output === null || exports.output === void 0 ? void 0 : exports.output.appendLine(`Setting keysForSync = ${keysForSync}`, exports.output.messageType.Info);
    context.subscriptions.push(vscode_1.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("gistpad.output")) {
            if (config.get("output")) {
                exports.output = new output_1.Output();
            }
            else {
                exports.output.dispose();
            }
        }
    }));
    context.globalState.setKeysForSync(keysForSync);
    return {
        extendMarkdownIt: markdownPreview_1.extendMarkdownIt
    };
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map