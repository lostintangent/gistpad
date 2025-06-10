"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoCommitComment = void 0;
exports.registerCommentController = registerCommentController;
const vscode_1 = require("vscode");
const constants_1 = require("../../constants");
const auth_1 = require("../../store/auth");
const fileSystem_1 = require("../fileSystem");
const store_1 = require("../store");
const actions_1 = require("./actions");
const commands_1 = require("./commands");
class RepoCommitComment {
    constructor(comment, repo, parent, currentUser) {
        this.repo = repo;
        this.parent = parent;
        this.currentUser = currentUser;
        this.mode = vscode_1.CommentMode.Preview;
        this.id = comment.id;
        this.body = new vscode_1.MarkdownString(comment.body);
        this.author = {
            name: comment.user.login,
            iconPath: vscode_1.Uri.parse(comment.user.avatar_url)
        };
        this.label = comment.author_association === "OWNER" ? "Owner" : "";
        this.contextValue = currentUser === comment.user.login ? "canEdit" : "";
    }
}
exports.RepoCommitComment = RepoCommitComment;
function commentRange({ line }) {
    return new vscode_1.Range(line - 1, 0, line - 1, 0);
}
let controller;
async function checkForComments(uri) {
    const [repo, path] = fileSystem_1.RepoFileSystemProvider.getFileInfo(uri);
    const repoComments = await (0, actions_1.getRepoComments)(repo);
    const fileComments = repoComments.filter((comment) => comment.path === path);
    const currentUser = (0, auth_1.getCurrentUser)();
    if (fileComments.length > 0) {
        fileComments.forEach((comment) => {
            const thread = controller.createCommentThread(uri, commentRange(comment), []);
            thread.collapsibleState = vscode_1.CommentThreadCollapsibleState.Expanded;
            thread.canReply = false;
            thread.comments = [
                new RepoCommitComment(comment, repo, thread, currentUser)
            ];
        });
    }
}
async function registerCommentController(context) {
    vscode_1.workspace.onDidOpenTextDocument(async (document) => {
        if (fileSystem_1.RepoFileSystemProvider.isRepoDocument(document)) {
            if (!controller) {
                controller = vscode_1.comments.createCommentController(`${constants_1.EXTENSION_NAME}:repo`, "GistPad");
                controller.commentingRangeProvider = {
                    provideCommentingRanges: (document) => {
                        if (
                        // We don't want to register two comments providers at the same time
                        !store_1.store.isInCodeTour &&
                            fileSystem_1.RepoFileSystemProvider.isRepoDocument(document)) {
                            return [new vscode_1.Range(0, 0, document.lineCount, 0)];
                        }
                    }
                };
            }
            checkForComments(document.uri);
        }
    });
    vscode_1.workspace.onDidCloseTextDocument((e) => {
        if (fileSystem_1.RepoFileSystemProvider.isRepoDocument(e) &&
            !vscode_1.window.visibleTextEditors.find((editor) => fileSystem_1.RepoFileSystemProvider.isRepoDocument(editor.document))) {
            controller.dispose();
            controller = undefined;
        }
    });
    (0, commands_1.registerCommentCommands)(context);
}
//# sourceMappingURL=index.js.map