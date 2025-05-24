"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommentCommands = void 0;
const vscode_1 = require("vscode");
const comments_1 = require("../comments");
const constants_1 = require("../constants");
const actions_1 = require("../store/actions");
const auth_1 = require("../store/auth");
const utils_1 = require("../utils");
async function addComment(reply) {
    let thread = reply.thread;
    const { gistId } = (0, utils_1.getGistDetailsFromUri)(thread.uri);
    const comment = await (0, actions_1.createGistComment)(gistId, reply.text);
    let newComment = new comments_1.GistCodeComment(comment, gistId, thread, (0, auth_1.getCurrentUser)());
    thread.comments = [...thread.comments, newComment];
}
function registerCommentCommands(context) {
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.addGistComment`, addComment));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.replyGistComment`, addComment));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.editGistComment`, async (comment) => {
        if (!comment.parent) {
            return;
        }
        comment.parent.comments = comment.parent.comments.map((cmt) => {
            if (cmt.id === comment.id) {
                cmt.mode = vscode_1.CommentMode.Editing;
            }
            return cmt;
        });
    }));
    vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.saveGistComment`, async (comment) => {
        if (!comment.parent) {
            return;
        }
        const content = comment.body instanceof vscode_1.MarkdownString
            ? comment.body.value
            : comment.body;
        await (0, actions_1.editGistComment)(comment.gistId, comment.id, content);
        comment.parent.comments = comment.parent.comments.map((cmt) => {
            if (cmt.id === comment.id) {
                cmt.mode = vscode_1.CommentMode.Preview;
            }
            return cmt;
        });
    });
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.deleteGistComment`, async (comment) => {
        let thread = comment.parent;
        if (!thread) {
            return;
        }
        await (0, actions_1.deleteGistComment)(comment.gistId, comment.id);
        thread.comments = thread.comments.filter((cmt) => cmt.id !== comment.id);
        if (thread.comments.length === 0) {
            thread.dispose();
        }
    }));
}
exports.registerCommentCommands = registerCommentCommands;
//# sourceMappingURL=comments.js.map