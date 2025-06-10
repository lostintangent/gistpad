"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWikiController = registerWikiController;
const commands_1 = require("./commands");
const comments_1 = require("./comments");
const completionProvider_1 = require("./completionProvider");
const decorator_1 = require("./decorator");
const hoverProvider_1 = require("./hoverProvider");
const linkProvider_1 = require("./linkProvider");
const statusBar_1 = require("./statusBar");
function registerWikiController(context) {
    (0, commands_1.registerCommands)(context);
    (0, decorator_1.registerLinkDecorator)();
    (0, hoverProvider_1.registerHoverProvider)();
    (0, completionProvider_1.registerLinkCompletionProvider)();
    (0, linkProvider_1.registerDocumentLinkProvider)();
    (0, comments_1.registerCommentController)();
    (0, statusBar_1.registerStatusBar)();
}
//# sourceMappingURL=index.js.map