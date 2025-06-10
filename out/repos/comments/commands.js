"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommentCommands = registerCommentCommands;
const vscode_1 = require("vscode");
const _1 = require(".");
const constants_1 = require("../../constants");
const auth_1 = require("../../store/auth");
const fileSystem_1 = require("../fileSystem");
const store_1 = require("../store");
const actions_1 = require("./actions");
function updateComments(comment, mode) {
    comment.parent.comments = comment.parent.comments.map((c) => {
        if (c.id === comment.id) {
            c.mode = mode;
        }
        return c;
    });
}
function registerCommentCommands(context) {
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.addRepositoryComment`, async ({ text, thread }) => {
        const [repo, path] = fileSystem_1.RepoFileSystemProvider.getFileInfo(thread.uri);
        const repository = store_1.store.repos.find((r) => r.name === repo);
        const comment = await (0, actions_1.createRepoComment)(repo, path, text, thread.range.start.line + 1);
        repository === null || repository === void 0 ? void 0 : repository.comments.push(comment);
        const newComment = new _1.RepoCommitComment(comment, repo, thread, (0, auth_1.getCurrentUser)());
        thread.comments = [newComment];
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.deleteRepositoryComment`, async (comment) => {
        await (0, actions_1.deleteRepoComment)(comment.repo, comment.id);
        comment.parent.dispose();
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.editRepositoryComment`, async (comment) => updateComments(comment, vscode_1.CommentMode.Editing)));
    vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.saveRepositoryComment`, async (comment) => {
        const content = comment.body instanceof vscode_1.MarkdownString
            ? comment.body.value
            : comment.body;
        await (0, actions_1.editRepoComment)(comment.repo, comment.id, content);
        updateComments(comment, vscode_1.CommentMode.Preview);
    });
}
//# sourceMappingURL=commands.js.map