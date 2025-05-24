"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoryFileBackLinkNode = exports.RepositoryFileNode = exports.RepositoryNode = void 0;
const vscode_1 = require("vscode");
const fileSystem_1 = require("../fileSystem");
const store_1 = require("../store");
class RepositoryNode extends vscode_1.TreeItem {
    constructor(repo) {
        var _a;
        super(repo.name, vscode_1.TreeItemCollapsibleState.Expanded);
        this.repo = repo;
        const iconName = repo.isWiki ? "book" : "repo";
        this.iconPath = new vscode_1.ThemeIcon(iconName);
        this.contextValue =
            "gistpad." + (repo.isSwing ? "swing" : repo.isWiki ? "wiki" : "repo");
        if (repo.isWiki && ((_a = store_1.store.wiki) === null || _a === void 0 ? void 0 : _a.name) === repo.name) {
            this.description = "Primary";
        }
        if (repo.branch !== repo.defaultBranch) {
            this.contextValue += ".branch";
            this.description = repo.branch;
        }
        if (repo.hasTours) {
            this.contextValue += ".hasTours";
        }
        this.tooltip = `Repo: ${repo.name}
Branch: ${repo.branch}`;
    }
}
exports.RepositoryNode = RepositoryNode;
class RepositoryFileNode extends vscode_1.TreeItem {
    constructor(repo, file) {
        super(file.name, file.isDirectory || file.backLinks
            ? vscode_1.TreeItemCollapsibleState.Collapsed
            : vscode_1.TreeItemCollapsibleState.None);
        this.repo = repo;
        this.file = file;
        this.iconPath = file.isDirectory ? vscode_1.ThemeIcon.Folder : vscode_1.ThemeIcon.File;
        this.resourceUri = file.uri;
        if (!file.isDirectory) {
            this.command = {
                command: "vscode.open",
                title: "Open file",
                arguments: [file.uri]
            };
        }
        if (repo.isWiki && file.backLinks) {
            this.description = file.backLinks.length.toString();
        }
        else if (file.isDirectory) {
            this.description = file.files.length.toString();
        }
        const repoType = repo.isWiki ? "wiki" : "repo";
        this.contextValue = file.isDirectory
            ? `gistpad.${repoType}Directory`
            : "gistpad.repoFile";
    }
}
exports.RepositoryFileNode = RepositoryFileNode;
function getbackLinkDisplayName(uri) {
    const [, file] = fileSystem_1.RepoFileSystemProvider.getRepoInfo(uri);
    return (file === null || file === void 0 ? void 0 : file.displayName) || (file === null || file === void 0 ? void 0 : file.path) || "";
}
class RepositoryFileBackLinkNode extends vscode_1.TreeItem {
    constructor(repo, backLink) {
        super(getbackLinkDisplayName(backLink.location.uri), vscode_1.TreeItemCollapsibleState.None);
        this.backLink = backLink;
        this.description = backLink.linePreview;
        this.tooltip = backLink.linePreview;
        this.command = {
            command: "vscode.open",
            arguments: [
                backLink.location.uri,
                { selection: backLink.location.range }
            ],
            title: "Open File"
        };
        this.contextValue = "gistpad.repoFile.backLink";
    }
}
exports.RepositoryFileBackLinkNode = RepositoryFileBackLinkNode;
//# sourceMappingURL=nodes.js.map