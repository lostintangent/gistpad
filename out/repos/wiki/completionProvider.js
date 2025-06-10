"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLinkCompletionProvider = registerLinkCompletionProvider;
const vscode_1 = require("vscode");
const constants_1 = require("../../constants");
const fileSystem_1 = require("../fileSystem");
const utils_1 = require("./utils");
class WikiLinkCompletionProvider {
    provideCompletionItems(document, position) {
        const [repo, file] = fileSystem_1.RepoFileSystemProvider.getRepoInfo(document.uri);
        if (!repo.isWiki) {
            return;
        }
        const lineText = document
            .lineAt(position)
            .text.substr(0, position.character);
        const linkOpening = lineText.lastIndexOf(utils_1.LINK_PREFIX);
        if (linkOpening === -1) {
            return;
        }
        const link = lineText.substr(linkOpening + utils_1.LINK_PREFIX.length);
        if (link === undefined || link.includes(utils_1.LINK_SUFFIX)) {
            return;
        }
        const documents = repo.documents.filter((doc) => doc.path !== (file === null || file === void 0 ? void 0 : file.path));
        const documentItems = documents.map((doc) => {
            const item = new vscode_1.CompletionItem(doc.displayName || doc.path, vscode_1.CompletionItemKind.File);
            // Automatically save the document upon selection
            // in order to update the backlinks in the tree.
            item.command = {
                command: "workbench.action.files.save",
                title: "Reference document"
            };
            return item;
        });
        if (!(0, utils_1.getTreeItemFromLink)(repo, link)) {
            const newDocumentItem = new vscode_1.CompletionItem(link, vscode_1.CompletionItemKind.File);
            newDocumentItem.detail = `Create new page page "${link}"`;
            // Since we're dynamically updating the range as the user types,
            // we need to ensure the range spans the enter document name.
            newDocumentItem.range = new vscode_1.Range(position.translate({ characterDelta: -link.length }), position);
            // As soon as the user accepts this item,
            // automatically create the new document.
            newDocumentItem.command = {
                command: `${constants_1.EXTENSION_NAME}._createWikiPage`,
                title: "Create new page",
                arguments: [repo, link]
            };
            documentItems.unshift(newDocumentItem);
        }
        return documentItems;
    }
}
let triggerCharacters = [...Array(94).keys()].map((i) => String.fromCharCode(i + 32));
async function registerLinkCompletionProvider() {
    vscode_1.languages.registerCompletionItemProvider(utils_1.LINK_SELECTOR, new WikiLinkCompletionProvider(), ...triggerCharacters);
}
//# sourceMappingURL=completionProvider.js.map