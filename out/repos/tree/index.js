"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTreeProvider = exports.focusRepo = void 0;
const mobx_1 = require("mobx");
const vscode_1 = require("vscode");
const constants_1 = require("../../constants");
const store_1 = require("../../store");
const store_2 = require("../store");
const nodes_1 = require("./nodes");
class RepositoryTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData
            .event;
        this.getTreeItem = (node) => node;
        (0, mobx_1.reaction)(() => [
            store_1.store.isSignedIn,
            store_2.store.repos.map((repo) => [
                repo.isLoading,
                repo.hasTours,
                repo.tree
                    ? repo.tree.tree.map((item) => [
                        item.path,
                        item.displayName,
                        item.backLinks
                            ? item.backLinks.map((link) => link.linePreview)
                            : null
                    ])
                    : null
            ])
        ], () => {
            this._onDidChangeTreeData.fire();
        });
    }
    getBackLinkNodes(file, repo) {
        var _a;
        return (_a = file.backLinks) === null || _a === void 0 ? void 0 : _a.map((backLink) => new nodes_1.RepositoryFileBackLinkNode(repo.name, backLink));
    }
    getFileNodes(parent, repo) {
        var _a;
        return (_a = parent.files) === null || _a === void 0 ? void 0 : _a.map((file) => new nodes_1.RepositoryFileNode(repo, file));
    }
    getChildren(element) {
        if (!element && store_1.store.isSignedIn && store_2.store.repos.length > 0) {
            return store_2.store.repos
                .slice().sort((a, b) => a.name.localeCompare(b.name))
                .map((repo) => new nodes_1.RepositoryNode(repo));
        }
        else if (element instanceof nodes_1.RepositoryNode) {
            if (element.repo.isLoading) {
                return [new vscode_1.TreeItem("Loading repository...")];
            }
            const fileNodes = this.getFileNodes(element.repo, element.repo);
            if (fileNodes) {
                return fileNodes;
            }
            else {
                const addItemSuffix = element.repo.isWiki ? "page" : "file";
                const addFileItem = new vscode_1.TreeItem(`Add new ${addItemSuffix}`);
                const addItemCommand = element.repo.isWiki
                    ? "addWikiPage"
                    : "addRepositoryFile";
                addFileItem.command = {
                    command: `${constants_1.EXTENSION_NAME}.${addItemCommand}`,
                    title: `Add new ${addItemSuffix}`,
                    arguments: [element]
                };
                return [addFileItem];
            }
        }
        else if (element instanceof nodes_1.RepositoryFileNode) {
            if (element.file.isDirectory) {
                return this.getFileNodes(element.file, element.repo);
            }
            else if (element.file.backLinks) {
                return this.getBackLinkNodes(element.file, element.repo);
            }
        }
    }
    getParent(element) {
        return undefined;
    }
}
let treeView;
function focusRepo(repo) {
    treeView.reveal(new nodes_1.RepositoryNode(repo));
}
exports.focusRepo = focusRepo;
function registerTreeProvider() {
    treeView = vscode_1.window.createTreeView(`${constants_1.EXTENSION_NAME}.repos`, {
        showCollapseAll: true,
        treeDataProvider: new RepositoryTreeProvider(),
        canSelectMany: true
    });
}
exports.registerTreeProvider = registerTreeProvider;
//# sourceMappingURL=index.js.map