"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const auth_1 = require("./auth");
const comments_1 = require("./comments");
const daily_1 = require("./daily");
const directory_1 = require("./directory");
const editor_1 = require("./editor");
const file_1 = require("./file");
const follow_1 = require("./follow");
const gist_1 = require("./gist");
const notebook_1 = require("./notebook");
const tour_1 = require("./tour");
function registerCommands(context) {
    (0, auth_1.registerAuthCommands)(context);
    (0, comments_1.registerCommentCommands)(context);
    (0, directory_1.registerDirectoryCommands)(context);
    (0, editor_1.registerEditorCommands)(context);
    (0, file_1.registerFileCommands)(context);
    (0, follow_1.registerFollowCommands)(context);
    (0, gist_1.registerGistCommands)(context);
    (0, notebook_1.registerNotebookCommands)(context);
    (0, daily_1.registerDailyCommands)(context);
    (0, tour_1.registerTourCommands)(context);
}
//# sourceMappingURL=index.js.map