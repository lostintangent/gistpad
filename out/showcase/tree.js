"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTreeProvider = exports.GistShowcaseCategoryNode = void 0;
const mobx_1 = require("mobx");
const vscode_1 = require("vscode");
const constants_1 = require("../constants");
const tree_1 = require("../tree");
const nodes_1 = require("../tree/nodes");
const utils_1 = require("../utils");
const store_1 = require("./store");
class GistShowcaseCategoryNode extends nodes_1.TreeNode {
    constructor(category) {
        super(category.title, vscode_1.TreeItemCollapsibleState.Expanded);
        this.category = category;
        this.contextValue = "showcase.category";
    }
}
exports.GistShowcaseCategoryNode = GistShowcaseCategoryNode;
class ShowcaseTreeProvider {
    constructor(extensionContext) {
        this.extensionContext = extensionContext;
        this._disposables = [];
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData
            .event;
        (0, mobx_1.reaction)(() => {
            var _a;
            return [
                store_1.store.showcase.isLoading,
                (_a = store_1.store.showcase) === null || _a === void 0 ? void 0 : _a.categories.map((category) => [category.isLoading])
            ];
        }, () => {
            this._onDidChangeTreeData.fire();
        });
    }
    getTreeItem(node) {
        return node;
    }
    getChildren(element) {
        var _a;
        if (!element) {
            if (store_1.store.showcase.isLoading) {
                return [new nodes_1.TreeNode("Loading showcase...")];
            }
            return (_a = store_1.store.showcase) === null || _a === void 0 ? void 0 : _a.categories.map((category) => new GistShowcaseCategoryNode(category));
        }
        else if (element instanceof GistShowcaseCategoryNode) {
            if (element.category.isLoading) {
                return [new nodes_1.LoadingNode()];
            }
            return element.category.gists.map((gist) => {
                const owned = (0, utils_1.isOwnedGist)(gist.id);
                return owned
                    ? new nodes_1.GistNode(gist, this.extensionContext)
                    : new nodes_1.FollowedUserGistNode(gist, this.extensionContext);
            });
        }
        else if (element instanceof nodes_1.GistNode) {
            return (0, tree_1.getGistFiles)(element.gist);
        }
        else if (element instanceof nodes_1.GistDirectoryNode) {
            return (0, tree_1.getGistFiles)(element.gist, element.directory);
        }
    }
    dispose() {
        this._disposables.forEach((disposable) => disposable.dispose());
    }
}
function registerTreeProvider(extensionContext) {
    vscode_1.window.createTreeView(`${constants_1.EXTENSION_NAME}.showcase`, {
        showCollapseAll: true,
        treeDataProvider: new ShowcaseTreeProvider(extensionContext),
        canSelectMany: true
    });
}
exports.registerTreeProvider = registerTreeProvider;
//# sourceMappingURL=tree.js.map