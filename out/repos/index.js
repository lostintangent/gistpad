"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRepoModule = registerRepoModule;
const mobx_1 = require("mobx");
const store_1 = require("../store");
const tour_1 = require("../tour");
const commands_1 = require("./commands");
const comments_1 = require("./comments");
const fileSystem_1 = require("./fileSystem");
const actions_1 = require("./store/actions");
const storage_1 = require("./store/storage");
const tours_1 = require("./tours");
const tree_1 = require("./tree");
const wiki_1 = require("./wiki");
async function registerRepoModule(context) {
    (0, commands_1.registerRepoCommands)(context);
    (0, fileSystem_1.registerRepoFileSystemProvider)();
    (0, tree_1.registerTreeProvider)();
    (0, storage_1.initializeStorage)(context);
    (0, comments_1.registerCommentController)(context);
    (0, wiki_1.registerWikiController)(context);
    if (await (0, tour_1.isCodeTourInstalled)()) {
        (0, tours_1.registerTourController)(context);
    }
    await (0, mobx_1.when)(() => store_1.store.isSignedIn);
    (0, actions_1.refreshRepositories)();
}
//# sourceMappingURL=index.js.map