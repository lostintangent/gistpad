"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extendMarkdownIt = void 0;
const vscode = require("vscode");
const fileSystem_1 = require("../fileSystem");
const utils_1 = require("./utils");
function extendMarkdownIt(md) {
    return md
        .use(require("markdown-it-regex").default, {
        name: "gistpad-links",
        regex: /(?<!\!)(?:\[\[)([^\]]+?)(?:\]\])/,
        replace: (link) => {
            if (!fileSystem_1.RepoFileSystemProvider.isRepoDocument(vscode.window.activeTextEditor.document)) {
                return;
            }
            const [repo] = fileSystem_1.RepoFileSystemProvider.getRepoInfo(vscode.window.activeTextEditor.document.uri);
            if (!repo.isWiki) {
                return;
            }
            const linkUri = (0, utils_1.getUriFromLink)(repo, link);
            const args = encodeURIComponent(JSON.stringify([linkUri]));
            const href = `command:vscode.open?${args}`;
            return `[[<a href=${href} title=${link}>${link}</a>]]`;
        }
    })
        .use(require("markdown-it-regex").default, {
        name: "gistpad-embeds",
        regex: /(?:\!\[\[)([^\]]+?)(?:\]\])/,
        replace: (link) => {
            if (!fileSystem_1.RepoFileSystemProvider.isRepoDocument(vscode.window.activeTextEditor.document)) {
                return;
            }
            const [repo] = fileSystem_1.RepoFileSystemProvider.getRepoInfo(vscode.window.activeTextEditor.document.uri);
            if (!repo.isWiki) {
                return;
            }
            const treeItem = (0, utils_1.getTreeItemFromLink)(repo, link);
            if (treeItem) {
                const markdown = require("markdown-it")();
                markdown.renderer.rules.heading_open = (tokens, index, options, env, self) => {
                    tokens[index].attrSet("style", "text-align: center; border: 0; margin: 10px 0 5px 0");
                    return self.renderToken(tokens, index, options, env, self);
                };
                const htmlContent = markdown.render(treeItem.contents);
                return `<div>
<hr />
${htmlContent}
<hr />
</div>`;
            }
        }
    });
}
exports.extendMarkdownIt = extendMarkdownIt;
//# sourceMappingURL=markdownPreview.js.map