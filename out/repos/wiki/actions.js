"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTree = void 0;
const mobx_1 = require("mobx");
const vscode_1 = require("vscode");
const utils_1 = require("../../utils");
const fileSystem_1 = require("../fileSystem");
const actions_1 = require("../store/actions");
const utils_2 = require("./utils");
async function getBackLinks(uri, contents) {
    const documentLinks = [...(0, utils_2.findLinks)(contents)];
    return Promise.all(documentLinks.map(async ({ title, contentStart, contentEnd }) => {
        const document = await vscode_1.workspace.openTextDocument(uri);
        const start = document.positionAt(contentStart);
        const end = document.positionAt(contentEnd);
        return {
            title,
            linePreview: document.lineAt(start).text,
            location: new vscode_1.Location(uri, new vscode_1.Range(start, end))
        };
    }));
}
async function updateTree(repo, tree) {
    if (!(0, utils_2.isWiki)(repo, tree)) {
        repo.tree = tree;
        return;
    }
    const markdownFiles = tree.tree.filter((treeItem) => treeItem.path.endsWith(".md"));
    const documents = await Promise.all(markdownFiles.map(async (treeItem) => {
        const contents = (0, utils_1.byteArrayToString)(await (0, actions_1.getRepoFile)(repo.name, treeItem.sha));
        treeItem.contents = contents;
        const match = contents.match(/^(?:#+\s*)(.+)$/m);
        const displayName = match ? match[1].trim() : undefined;
        treeItem.displayName = displayName;
        return treeItem;
    }));
    repo.tree = tree;
    repo.isLoading = false;
    for (let { path, contents } of documents) {
        const uri = fileSystem_1.RepoFileSystemProvider.getFileUri(repo.name, path);
        const links = await getBackLinks(uri, contents);
        for (const link of links) {
            const item = (0, utils_2.getTreeItemFromLink)(repo, link.title);
            if (item) {
                const entry = documents.find((doc) => doc.path === item.path);
                if (entry.backLinks) {
                    entry.backLinks.push(link);
                }
                else {
                    entry.backLinks = [link];
                }
            }
        }
    }
    (0, mobx_1.runInAction)(() => {
        var _a;
        for (let { path, backLinks } of documents) {
            const item = (_a = repo.tree) === null || _a === void 0 ? void 0 : _a.tree.find((item) => item.path === path);
            item.backLinks = backLinks;
        }
    });
}
exports.updateTree = updateTree;
//# sourceMappingURL=actions.js.map