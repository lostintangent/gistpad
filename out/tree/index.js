"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTreeProvider = exports.getGistFiles = void 0;
const mobx_1 = require("mobx");
const vscode_1 = require("vscode");
const constants_1 = require("../constants");
const store_1 = require("../store");
const utils_1 = require("../utils");
const nodes_1 = require("./nodes");
async function getGistFiles(gist, subDirectory) {
    const directory = subDirectory ? `${subDirectory}/` : "";
    const files = await vscode_1.workspace.fs.readDirectory((0, utils_1.fileNameToUri)(gist.id, directory));
    return files
        .sort(([_, typeA], [__, typeB]) => typeB - typeA)
        .map(([file, fileType]) => {
        return fileType === vscode_1.FileType.Directory
            ? new nodes_1.GistDirectoryNode(gist, file)
            : new nodes_1.GistFileNode(gist.id, gist.files[`${(0, utils_1.encodeDirectoryName)(directory)}${file}`]);
    });
}
exports.getGistFiles = getGistFiles;
class GistTreeProvider {
    constructor(store, extensionContext) {
        this.store = store;
        this.extensionContext = extensionContext;
        this._disposables = [];
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.COLLAPSED_STATES_KEY = "gistTreeCollapsedStates";
        (0, mobx_1.reaction)(() => [
            store.scratchNotes.gist ? store.scratchNotes.gist.updated_at : null,
            store.scratchNotes.show,
            store.gists.map((gist) => [gist.description, gist.updated_at]),
            store.archivedGists.map((gist) => [gist.description, gist.updated_at]),
            store.starredGists.map((gist) => [gist.description, gist.updated_at]),
            store.followedUsers.map((user) => user.isLoading),
            store.isLoading,
            store.isSignedIn,
            store.sortOrder,
            store.groupType
        ], () => {
            this._onDidChangeTreeData.fire();
        });
    }
    getCollapsedStates() {
        return this.extensionContext.globalState.get(this.COLLAPSED_STATES_KEY, {});
    }
    isRootNode(node) {
        return (node instanceof nodes_1.GistsNode ||
            node instanceof nodes_1.StarredGistsNode ||
            node instanceof nodes_1.ScratchGistNode ||
            node instanceof nodes_1.ArchivedGistsNode);
    }
    async setCollapsedState(node, collapsed) {
        if (this.isRootNode(node)) {
            const states = this.getCollapsedStates();
            states[node.contextValue] = collapsed;
            await this.extensionContext.globalState.update(this.COLLAPSED_STATES_KEY, states);
        }
    }
    getTreeItem(node) {
        if (this.isRootNode(node)) {
            const states = this.getCollapsedStates();
            const state = states[node.contextValue];
            if (state !== undefined) {
                node.collapsibleState = state
                    ? vscode_1.TreeItemCollapsibleState.Collapsed
                    : vscode_1.TreeItemCollapsibleState.Expanded;
            }
        }
        return node;
    }
    groupGists(gists, nodeConstructor, collapsibleState = vscode_1.TreeItemCollapsibleState.Collapsed) {
        if (this.store.groupType != store_1.GroupType.none) {
            const types = gists.map((gist) => gist.type);
            const tags = gists.flatMap((gist) => gist.tags);
            const tagsAndTypes = new Set(tags.concat(types).sort());
            return Array.from(tagsAndTypes).map((tag) => new nodes_1.GistGroupNode(tag, (0, utils_1.sortGists)(gists.filter((gist) => { var _a; return gist.type === tag || ((_a = gist.tags) === null || _a === void 0 ? void 0 : _a.includes(tag)); })), nodeConstructor, this.extensionContext, collapsibleState));
        }
        else {
            return (0, utils_1.sortGists)(gists).map((gist) => new nodeConstructor(gist, this.extensionContext));
        }
    }
    async getChildren(element) {
        if (!element) {
            if (!this.store.isSignedIn) {
                // Display the welcome view
                return undefined;
            }
            else {
                if (this.store.isLoading) {
                    return [new nodes_1.LoadingNode()];
                }
                else {
                    const nodes = [
                        new nodes_1.GistsNode(this.store.gists.length, this.store.login, this.extensionContext)
                    ];
                    if (this.store.scratchNotes.show) {
                        nodes.unshift(new nodes_1.ScratchGistNode(this.extensionContext, this.store.scratchNotes.gist));
                    }
                    if (this.store.starredGists.length > 0) {
                        nodes.push(new nodes_1.StarredGistsNode(this.store.starredGists.length, this.extensionContext));
                    }
                    if (this.store.followedUsers.length > 0) {
                        this.store.followedUsers.forEach((user) => {
                            nodes.push(new nodes_1.FollowedUserGistsNode(user, this.extensionContext));
                        });
                    }
                    if (this.store.archivedGists.length > 0) {
                        nodes.push(new nodes_1.ArchivedGistsNode(this.store.archivedGists.length));
                    }
                    return nodes;
                }
            }
        }
        else if (element instanceof nodes_1.GistsNode) {
            if (this.store.gists.length === 0) {
                return [new nodes_1.CreateNewGistNode()];
            }
            else {
                return this.groupGists(this.store.gists, nodes_1.GistNode);
            }
        }
        else if (element instanceof nodes_1.ArchivedGistsNode) {
            return this.groupGists(this.store.archivedGists, nodes_1.GistNode);
        }
        else if (element instanceof nodes_1.StarredGistsNode) {
            if (this.store.starredGists.length === 0) {
                return [new nodes_1.NoStarredGistsNode()];
            }
            else {
                return this.groupGists(this.store.starredGists, nodes_1.StarredGistNode, vscode_1.TreeItemCollapsibleState.Collapsed);
            }
        }
        else if (element instanceof nodes_1.GistGroupNode) {
            const showIcons = this.store.groupType == store_1.GroupType.none;
            return element.gists.map((gist) => new element.nodeConstructor(gist, this.extensionContext, showIcons));
        }
        else if (element instanceof nodes_1.GistNode) {
            return getGistFiles(element.gist);
        }
        else if (element instanceof nodes_1.StarredGistNode) {
            return getGistFiles(element.gist);
        }
        else if (element instanceof nodes_1.FollowedUserGistsNode) {
            if (element.user.isLoading) {
                return [new nodes_1.LoadingNode()];
            }
            else if (element.user.gists.length === 0) {
                return [new nodes_1.NoUserGistsNode()];
            }
            else {
                return this.groupGists(element.user.gists, nodes_1.FollowedUserGistNode, vscode_1.TreeItemCollapsibleState.Collapsed);
            }
        }
        else if (element instanceof nodes_1.FollowedUserGistNode) {
            return getGistFiles(element.gist);
        }
        else if (element instanceof nodes_1.GistDirectoryNode) {
            return getGistFiles(element.gist, element.directory);
        }
        else if (element instanceof nodes_1.ScratchGistNode) {
            if (!element.gist || Object.keys(element.gist.files).length === 0) {
                return [new nodes_1.NewScratchNoteNode()];
            }
            else {
                return getGistFiles(element.gist);
            }
        }
    }
    dispose() {
        this._disposables.forEach((disposable) => disposable.dispose());
    }
}
function registerTreeProvider(store, extensionContext) {
    const treeDataProvider = new GistTreeProvider(store, extensionContext);
    const treeView = vscode_1.window.createTreeView(`${constants_1.EXTENSION_NAME}.gists`, {
        showCollapseAll: true,
        treeDataProvider,
        canSelectMany: true
    });
    treeView.onDidCollapseElement((e) => treeDataProvider.setCollapsedState(e.element, true));
    treeView.onDidExpandElement((e) => treeDataProvider.setCollapsedState(e.element, false));
}
exports.registerTreeProvider = registerTreeProvider;
//# sourceMappingURL=index.js.map