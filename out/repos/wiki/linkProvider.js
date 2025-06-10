"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDocumentLinkProvider = registerDocumentLinkProvider;
const vscode_1 = require("vscode");
const constants_1 = require("../../constants");
const utils_1 = require("../../utils");
const fileSystem_1 = require("../fileSystem");
const utils_2 = require("./utils");
class WikiDocumentLink extends vscode_1.DocumentLink {
    constructor(repo, title, range, target) {
        super(range, target);
        this.repo = repo;
        this.title = title;
    }
}
class WikiDocumentLinkProvider {
    provideDocumentLinks(document) {
        const [repo] = fileSystem_1.RepoFileSystemProvider.getRepoInfo(document.uri);
        if (!repo.isWiki) {
            return;
        }
        const documentLinks = [...(0, utils_2.findLinks)(document.getText())];
        return documentLinks.map(({ title, contentStart, contentEnd }) => {
            const linkRange = new vscode_1.Range(document.positionAt(contentStart), document.positionAt(contentEnd));
            const treeItem = (0, utils_2.getTreeItemFromLink)(repo, title);
            const linkUri = treeItem ? (0, utils_2.getUriFromLink)(repo, title) : undefined;
            return new WikiDocumentLink(repo, title, linkRange, linkUri);
        });
    }
    async resolveDocumentLink(link, token) {
        const filePath = (0, utils_2.getPageFilePath)(link.title);
        link.target = fileSystem_1.RepoFileSystemProvider.getFileUri(link.repo.name, filePath);
        const treeItem = (0, utils_2.getTreeItemFromLink)(link.repo, link.title);
        if (!treeItem) {
            await (0, utils_1.withProgress)("Creating page...", async () => vscode_1.commands.executeCommand(`${constants_1.EXTENSION_NAME}._createWikiPage`, link.repo, link.title));
        }
        return link;
    }
}
function registerDocumentLinkProvider() {
    vscode_1.languages.registerDocumentLinkProvider(utils_2.LINK_SELECTOR, new WikiDocumentLinkProvider());
}
//# sourceMappingURL=linkProvider.js.map