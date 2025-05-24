"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHoverProvider = void 0;
const vscode_1 = require("vscode");
const fileSystem_1 = require("../fileSystem");
const utils_1 = require("./utils");
class LinkHoverProvider {
    provideHover(document, position) {
        const [repo] = fileSystem_1.RepoFileSystemProvider.getRepoInfo(document.uri);
        if (!repo.isWiki) {
            return;
        }
        const line = document.lineAt(position).text;
        const links = [...(0, utils_1.findLinks)(line)];
        if (!links) {
            return;
        }
        const link = links.find(({ start, end }) => {
            const range = new vscode_1.Range(position.line, start, position.line, end);
            return range.contains(position);
        });
        if (!link) {
            return;
        }
        const treeItem = (0, utils_1.getTreeItemFromLink)(repo, link.title);
        if (treeItem) {
            const contents = new vscode_1.MarkdownString(treeItem.contents);
            return new vscode_1.Hover(contents);
        }
    }
}
function registerHoverProvider() {
    vscode_1.languages.registerHoverProvider(utils_1.LINK_SELECTOR, new LinkHoverProvider());
}
exports.registerHoverProvider = registerHoverProvider;
//# sourceMappingURL=hoverProvider.js.map