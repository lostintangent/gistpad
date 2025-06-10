"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoFileSystemProvider = exports.REPO_SCHEME = void 0;
exports.registerRepoFileSystemProvider = registerRepoFileSystemProvider;
const vscode = require("vscode");
const store_1 = require("./store");
const actions_1 = require("./store/actions");
exports.REPO_SCHEME = "repo";
const REPO_QUERY = `${exports.REPO_SCHEME}=`;
class RepoFileSystemProvider {
    constructor() {
        this._onDidChangeFile = new vscode.EventEmitter();
        this.onDidChangeFile = this
            ._onDidChangeFile.event;
    }
    static getFileInfo(uri) {
        if (!uri.query.startsWith(REPO_QUERY)) {
            return;
        }
        const repo = decodeURIComponent(uri.query.replace(REPO_QUERY, ""));
        const path = uri.path.startsWith("/") ? uri.path.substr(1) : uri.path;
        return [repo, path];
    }
    static getRepoInfo(uri) {
        var _a;
        const match = RepoFileSystemProvider.getFileInfo(uri);
        if (!match) {
            return;
        }
        const repository = store_1.store.repos.find((repo) => repo.name === match[0]);
        const file = (_a = repository.tree) === null || _a === void 0 ? void 0 : _a.tree.find((file) => file.path === match[1]);
        return [repository, file];
    }
    static getFileUri(repo, filePath = "") {
        return vscode.Uri.parse(`${exports.REPO_SCHEME}:/${filePath}?${REPO_QUERY}${encodeURIComponent(repo)}`);
    }
    static isRepoDocument(document, repo) {
        return (document.uri.scheme === exports.REPO_SCHEME &&
            (!repo || document.uri.query === `${REPO_QUERY}${repo}`));
    }
    stat(uri) {
        if (uri.path === "/") {
            return {
                type: vscode.FileType.Directory,
                ctime: Date.now(),
                mtime: Date.now(),
                size: 100
            };
        }
        const fileInfo = RepoFileSystemProvider.getRepoInfo(uri);
        if (fileInfo && fileInfo[1]) {
            const type = fileInfo[1].type === "blob"
                ? vscode.FileType.File
                : vscode.FileType.Directory;
            return {
                type,
                ctime: Date.now(),
                mtime: Date.now(),
                size: 100
            };
        }
        else {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
    }
    async readFile(uri) {
        const [repository, file] = RepoFileSystemProvider.getRepoInfo(uri);
        return await (0, actions_1.getRepoFile)(repository.name, file.sha);
    }
    async writeFile(uri, content, options) {
        const [repository, file] = RepoFileSystemProvider.getRepoInfo(uri);
        if (!file) {
            const [, filePath] = RepoFileSystemProvider.getFileInfo(uri);
            await (0, actions_1.addRepoFile)(repository.name, repository.branch, filePath, Buffer.from(content).toString("base64"));
            this._onDidChangeFile.fire([
                { type: vscode.FileChangeType.Created, uri }
            ]);
        }
        else {
            await (0, actions_1.updateRepoFile)(repository.name, repository.branch, file.path, content, file.sha);
            this._onDidChangeFile.fire([
                { type: vscode.FileChangeType.Changed, uri }
            ]);
        }
    }
    async delete(uri) {
        const [repository, file] = RepoFileSystemProvider.getRepoInfo(uri);
        await (0, actions_1.deleteTreeItem)(repository, file);
        this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Deleted, uri }]);
    }
    async rename(oldUri, newUri, options) {
        const [repository, file] = RepoFileSystemProvider.getRepoInfo(oldUri);
        const [, newPath] = RepoFileSystemProvider.getFileInfo(newUri);
        await (0, actions_1.renameTreeItem)(repository, file, newPath);
        this._onDidChangeFile.fire([
            { type: vscode.FileChangeType.Deleted, uri: oldUri },
            { type: vscode.FileChangeType.Created, uri: newUri }
        ]);
    }
    readDirectory(uri) {
        if (uri.path === "/") {
            const [repository] = RepoFileSystemProvider.getRepoInfo(uri);
            return repository.files.map((file) => [
                file.name,
                file.isDirectory ? vscode.FileType.Directory : vscode.FileType.File
            ]);
        }
        return [];
    }
    createDirectory(uri) {
        // When performing a file rename, VS Code
        // may attempt to create parent directories
        // for the target file. So simply allow this
        // operation to no-op, since Git doesn't
        // actually have the concept of directories.
    }
    watch(_resource) {
        return { dispose: () => { } };
    }
}
exports.RepoFileSystemProvider = RepoFileSystemProvider;
function registerRepoFileSystemProvider() {
    vscode.workspace.registerFileSystemProvider(exports.REPO_SCHEME, new RepoFileSystemProvider());
}
//# sourceMappingURL=fileSystem.js.map