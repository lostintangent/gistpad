"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WikiBacklinksComments = void 0;
exports.registerCommentController = registerCommentController;
const vscode_1 = require("vscode");
const fileSystem_1 = require("../fileSystem");
class WikiBacklinksComments {
    constructor(backlinks) {
        this.mode = vscode_1.CommentMode.Preview;
        const content = backlinks
            .map((link) => {
            const [, file] = fileSystem_1.RepoFileSystemProvider.getRepoInfo(link.location.uri);
            const title = file.displayName || file.path;
            const args = [
                link.location.uri,
                {
                    selection: {
                        start: {
                            line: link.location.range.start.line,
                            character: link.location.range.start.character
                        },
                        end: {
                            line: link.location.range.end.line,
                            character: link.location.range.end.character
                        }
                    }
                }
            ];
            const command = `command:vscode.open?${encodeURIComponent(JSON.stringify(args))}`;
            return `### [${title}](${command} 'Open the "${title}" page')
        
   \`\`\`markdown
   ${link.linePreview}
   \`\`\``;
        })
            .join("\r\n");
        const markdown = new vscode_1.MarkdownString(content);
        markdown.isTrusted = true;
        this.body = markdown;
        this.author = {
            name: "GistPad (Backlinks)",
            iconPath: vscode_1.Uri.parse("https://cdn.jsdelivr.net/gh/vsls-contrib/gistpad/images/icon.png")
        };
    }
}
exports.WikiBacklinksComments = WikiBacklinksComments;
let controller;
function registerCommentController() {
    vscode_1.window.onDidChangeActiveTextEditor((e) => {
        var _a;
        if (controller) {
            controller.dispose();
            controller = undefined;
        }
        if (!e || !fileSystem_1.RepoFileSystemProvider.isRepoDocument(e.document)) {
            return;
        }
        const info = fileSystem_1.RepoFileSystemProvider.getRepoInfo(e.document.uri);
        if (!info || !info[0].isWiki || !((_a = info[1]) === null || _a === void 0 ? void 0 : _a.backLinks)) {
            return;
        }
        controller = vscode_1.comments.createCommentController("gistpad.wiki", "Backlinks");
        const comment = new WikiBacklinksComments(info[1].backLinks);
        const thread = controller.createCommentThread(e.document.uri, new vscode_1.Range(e.document.lineCount, 0, e.document.lineCount, 0), [comment]);
        // @ts-ignore
        thread.canReply = false;
        thread.collapsibleState = vscode_1.CommentThreadCollapsibleState.Expanded;
        vscode_1.workspace.onDidChangeTextDocument((change) => {
            if (change.document.uri.toString() === e.document.uri.toString()) {
                thread.range = new vscode_1.Range(e.document.lineCount, 0, e.document.lineCount, 0);
            }
        });
    });
}
//# sourceMappingURL=comments.js.map