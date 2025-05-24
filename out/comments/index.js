"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommentController = exports.GistCodeComment = void 0;
const vscode_1 = require("vscode");
const config = require("../config");
const constants_1 = require("../constants");
const actions_1 = require("../store/actions");
const auth_1 = require("../store/auth");
const utils_1 = require("../utils");
class GistCodeComment {
    constructor(comment, gistId, parent, currentUser) {
        this.gistId = gistId;
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
        this.contextValue = comment.user.login === currentUser ? "canEdit" : "";
    }
}
exports.GistCodeComment = GistCodeComment;
function commentRange(document) {
    return new vscode_1.Range(document.lineCount, 0, document.lineCount, 0);
}
const documentComments = new Map();
async function registerCommentController() {
    const controller = vscode_1.comments.createCommentController(constants_1.EXTENSION_NAME, "Gist");
    controller.commentingRangeProvider = {
        provideCommentingRanges: (document) => {
            if ((0, utils_1.isGistDocument)(document)) {
                return [commentRange(document)];
            }
        }
    };
    vscode_1.workspace.onDidOpenTextDocument(async (document) => {
        if ((0, utils_1.isGistDocument)(document) &&
            !documentComments.has(document.uri.toString())) {
            const { gistId } = (0, utils_1.getGistDetailsFromUri)(document.uri);
            const comments = await (0, actions_1.getGistComments)(gistId);
            if (comments.length > 0) {
                const thread = controller.createCommentThread(document.uri, commentRange(document), []);
                const currentUser = (0, auth_1.getCurrentUser)();
                thread.comments = comments.map((comment) => new GistCodeComment(comment, gistId, thread, currentUser));
                const showCommentThread = config.get("comments.showThread");
                if (showCommentThread === "always" ||
                    (showCommentThread === "whenNotEmpty" && thread.comments.length > 0)) {
                    thread.collapsibleState = vscode_1.CommentThreadCollapsibleState.Expanded;
                }
                else {
                    thread.collapsibleState = vscode_1.CommentThreadCollapsibleState.Collapsed;
                }
                vscode_1.workspace.onDidChangeTextDocument((e) => {
                    if (e.document === document) {
                        thread.range = commentRange(document);
                    }
                });
                documentComments.set(document.uri.toString(), thread);
            }
        }
    });
}
exports.registerCommentController = registerCommentController;
//# sourceMappingURL=index.js.map