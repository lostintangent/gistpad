"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GistFileSystemProvider = void 0;
exports.registerFileSystemProvider = registerFileSystemProvider;
const path = require("path");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const vscode_1 = require("vscode");
const config = require("../config");
const constants_1 = require("../constants");
const actions_1 = require("../store/actions");
const auth_1 = require("../store/auth");
const utils_1 = require("../utils");
const api_1 = require("./api");
const gitFS = require("./git");
const isBinaryPath = require("is-binary-path");
class GistFileSystemProvider {
    constructor(store) {
        this.store = store;
        this._pendingWrites = new rxjs_1.Subject();
        this._onDidChangeFile = new vscode_1.EventEmitter();
        this.onDidChangeFile = this._onDidChangeFile.event;
        vscode_1.window.tabGroups.onDidChangeTabs(async (tabGroups) => {
            if (tabGroups.closed.length === 0) {
                return;
            }
            for (const tab of tabGroups.closed) {
                const input = tab.input;
                if (!(input instanceof vscode_1.TabInputText) || !input.uri) {
                    continue;
                }
                const uri = input.uri.toString();
                if (!uri.startsWith(constants_1.FS_SCHEME) || !this.store.unsyncedFiles.has(uri)) {
                    continue;
                }
                const { gistId, file: filename } = (0, utils_1.getGistDetailsFromUri)(input.uri);
                const result = await vscode_1.window.showWarningMessage(`"${filename}" has changes that haven't been synced.`, { modal: true }, "Sync Changes", "Discard Changes");
                if (result === "Sync Changes") {
                    const document = vscode_1.workspace.textDocuments.find((doc) => doc.uri.toString() === uri);
                    if (document) {
                        try {
                            await (0, api_1.updateGistFiles)(gistId, [
                                [filename, {
                                        content: document.getText()
                                    }]
                            ]);
                        }
                        catch (err) {
                            vscode_1.window.showErrorMessage(`Failed to sync changes: ${err.message}`);
                        }
                    }
                }
                else if (result === "Discard Changes") {
                    // We need to reset any changes that user made, which
                    // were persisted in the store, but have now been discarded.
                    await (0, actions_1.refreshGist)(gistId);
                }
                this.store.unsyncedFiles.delete(uri);
            }
        });
        this._pendingWrites
            .pipe((0, operators_1.buffer)(this._pendingWrites.pipe((0, operators_1.debounceTime)(100))))
            .subscribe((operations) => {
            const writesByGist = operations.reduce((map, operation) => {
                let operations = map.get(operation.gistId);
                if (!operations) {
                    operations = [];
                    map.set(operation.gistId, operations);
                }
                operations.push(operation);
                return map;
            }, new Map());
            writesByGist.forEach(async (writeOperations, gistId) => {
                await (0, api_1.updateGistFiles)(gistId, writeOperations.map((write) => {
                    const value = write.type === vscode_1.FileChangeType.Deleted
                        ? null
                        : {
                            filename: write.filename,
                            content: write.content
                        };
                    return [write.filename, value];
                }));
                writeOperations.forEach((write) => write.resolve());
                this._onDidChangeFile.fire(writeOperations);
            });
        });
    }
    async isDirectory(uri) {
        const { gistId } = (0, utils_1.getGistDetailsFromUri)(uri);
        let gist = this.store.gists
            .concat(this.store.archivedGists)
            .concat(this.store.starredGists)
            .find((gist) => gist.id === gistId);
        if (!gist) {
            gist = await (0, actions_1.getGist)(gistId);
        }
        const prefix = uri.path
            .substr(1)
            .replace(constants_1.DIRECTORY_SEPARATOR, constants_1.ENCODED_DIRECTORY_SEPARATOR);
        return !!Object.keys(gist.files).find((file) => file.startsWith(prefix));
    }
    async getGistFromUri(uri) {
        const { gistId } = (0, utils_1.getGistDetailsFromUri)(uri);
        const gists = this.store.gists
            .concat(this.store.archivedGists)
            .concat(this.store.starredGists);
        if (this.store.dailyNotes.gist) {
            gists.push(this.store.dailyNotes.gist);
        }
        let gist = gists.find((gist) => gist.id === gistId);
        if (!gist) {
            gist = await (0, actions_1.getGist)(gistId);
        }
        return gist;
    }
    async getFileFromUri(uri, gist) {
        const { file } = (0, utils_1.getGistDetailsFromUri)(uri);
        if (!gist) {
            gist = await this.getGistFromUri(uri);
        }
        return gist.files[file];
    }
    // TODO: Enable for binary files
    async copy(source, destination, options) {
        await (0, auth_1.ensureAuthenticated)();
        const { gistId } = (0, utils_1.getGistDetailsFromUri)(source);
        const newFileName = (0, utils_1.uriToFileName)(destination);
        const file = await this.getFileFromUri(source);
        await (0, api_1.updateGistFiles)(gistId, [
            [
                newFileName,
                {
                    content: file.content
                }
            ]
        ]);
        this._onDidChangeFile.fire([
            {
                type: vscode_1.FileChangeType.Created,
                uri: destination
            }
        ]);
    }
    createDirectory(uri) {
        // Gist doesn't actually support directories, so
        // we just no-op this function so that VS Code thinks
        // the directory was created when a file within a
        // directory is created (e.g. "/foo/bar.txt")
    }
    async delete(uri, options) {
        uri = (0, utils_1.encodeDirectoryUri)(uri);
        await (0, auth_1.ensureAuthenticated)();
        const { gistId, file } = (0, utils_1.getGistDetailsFromUri)(uri);
        return new Promise((resolve) => {
            this._pendingWrites.next({
                type: vscode_1.FileChangeType.Deleted,
                gistId,
                filename: file,
                uri,
                resolve
            });
        });
    }
    async readFile(uri) {
        uri = (0, utils_1.encodeDirectoryUri)(uri);
        const file = await this.getFileFromUri(uri);
        let contents = await (0, api_1.getFileContents)(file);
        if (isBinaryPath(file.filename)) {
            return contents;
        }
        else {
            if (contents.trim() === constants_1.ZERO_WIDTH_SPACE) {
                contents = "";
            }
            return (0, utils_1.stringToByteArray)(contents);
        }
    }
    async readDirectory(uri) {
        if (uri.path === "/") {
            const { gistId } = (0, utils_1.getGistDetailsFromUri)(uri);
            let gist = this.store.gists
                .concat(this.store.starredGists)
                .concat(this.store.archivedGists)
                .find((gist) => gist.id === gistId);
            if (!gist) {
                gist = await (0, actions_1.getGist)(gistId);
            }
            const seenDirectories = [];
            // @ts-ignore
            const files = Object.keys(gist.files)
                .map((file) => {
                if (file.includes(constants_1.ENCODED_DIRECTORY_SEPARATOR)) {
                    const directory = file.split(constants_1.ENCODED_DIRECTORY_SEPARATOR)[0];
                    return [directory, vscode_1.FileType.Directory];
                }
                else {
                    return [file, vscode_1.FileType.File];
                }
            })
                .filter(([file, fileType]) => {
                if (fileType === vscode_1.FileType.File)
                    return true;
                // @ts-ignore
                if (seenDirectories.includes(file)) {
                    return false;
                }
                else {
                    // @ts-ignore
                    seenDirectories.push(file);
                    return true;
                }
            });
            return files;
        }
        else {
            const { gistId } = (0, utils_1.getGistDetailsFromUri)(uri);
            let gist = this.store.gists
                .concat(this.store.starredGists)
                .concat(this.store.archivedGists)
                .find((gist) => gist.id === gistId);
            if (!gist) {
                gist = await (0, actions_1.getGist)(gistId);
            }
            const prefix = uri.path
                .substr(1)
                .replace(constants_1.DIRECTORY_SEPARATOR, constants_1.ENCODED_DIRECTORY_SEPARATOR);
            const files = Object.keys(gist.files)
                .filter((file) => file.startsWith(prefix))
                .map((file) => {
                const updatedFile = file.split(prefix)[1];
                if (updatedFile.includes(constants_1.ENCODED_DIRECTORY_SEPARATOR)) {
                    const directory = file.split(constants_1.ENCODED_DIRECTORY_SEPARATOR)[0];
                    return [directory, vscode_1.FileType.Directory];
                }
                else {
                    return [updatedFile, vscode_1.FileType.File];
                }
            });
            if (files.length > 0) {
                return files;
            }
            else {
                throw vscode_1.FileSystemError.FileNotFound;
            }
        }
    }
    async rename(oldUri, newUri, options) {
        oldUri = (0, utils_1.encodeDirectoryUri)(oldUri);
        newUri = (0, utils_1.encodeDirectoryUri)(newUri);
        await (0, auth_1.ensureAuthenticated)();
        const file = await this.getFileFromUri(oldUri);
        const { gistId } = (0, utils_1.getGistDetailsFromUri)(oldUri);
        const newFileName = (0, utils_1.uriToFileName)(newUri);
        if (isBinaryPath(file.filename)) {
            await gitFS.renameFile(gistId, file.filename, newFileName);
        }
        else {
            await (0, api_1.updateGistFiles)(gistId, [
                [
                    file.filename,
                    {
                        filename: newFileName
                    }
                ]
            ]);
        }
        this._onDidChangeFile.fire([
            {
                type: vscode_1.FileChangeType.Deleted,
                uri: oldUri
            },
            {
                type: vscode_1.FileChangeType.Created,
                uri: newUri
            }
        ]);
    }
    async stat(uri) {
        if (uri.path === constants_1.DIRECTORY_SEPARATOR) {
            return {
                type: vscode_1.FileType.Directory,
                size: 0,
                ctime: 0,
                mtime: 0
            };
        }
        else if (uri.path.endsWith(constants_1.DIRECTORY_SEPARATOR)) {
            if (await this.isDirectory(uri)) {
                return {
                    type: vscode_1.FileType.Directory,
                    size: 0,
                    ctime: 0,
                    mtime: 0
                };
            }
            throw vscode_1.FileSystemError.FileNotFound(uri);
        }
        uri = (0, utils_1.encodeDirectoryUri)(uri);
        const gist = await this.getGistFromUri(uri);
        const file = await this.getFileFromUri(uri, gist);
        if (!file) {
            throw vscode_1.FileSystemError.FileNotFound(uri);
        }
        return {
            type: vscode_1.FileType.File,
            ctime: 0,
            mtime: gist.updated_at ? Date.parse(gist.updated_at) : Date.now(),
            size: file.size
        };
    }
    async writeFile(uri, content, options) {
        uri = (0, utils_1.encodeDirectoryUri)(uri);
        const { gistId } = (0, utils_1.getGistDetailsFromUri)(uri);
        await (0, auth_1.ensureAuthenticated)();
        if (!(0, utils_1.isOwnedGist)(gistId)) {
            const response = await vscode_1.window.showInformationMessage("You can't edit a Gist you don't own.", "Fork this Gist");
            // TODO: Replay the edit after forking the gist
            if (response === "Fork this Gist") {
                await vscode_1.window.withProgress({
                    location: vscode_1.ProgressLocation.Notification,
                    title: "Forking Gist..."
                }, () => (0, actions_1.forkGist)(gistId));
            }
            return;
        }
        if (isBinaryPath(uri.path)) {
            await gitFS.addFile(gistId, path.basename(uri.path), content);
            this._onDidChangeFile.fire([
                {
                    type: vscode_1.FileChangeType.Created,
                    uri
                }
            ]);
        }
        else {
            const file = await this.getFileFromUri(uri);
            const type = file ? vscode_1.FileChangeType.Changed : vscode_1.FileChangeType.Created;
            const syncOnSaveEnabled = config.get("syncOnSave");
            if (!syncOnSaveEnabled && type === vscode_1.FileChangeType.Changed) {
                this.store.unsyncedFiles.add(uri.toString());
                this._onDidChangeFile.fire([{ type, uri }]);
                return;
            }
            return new Promise((resolve) => {
                this._pendingWrites.next({
                    type,
                    gistId,
                    filename: (0, utils_1.uriToFileName)(uri),
                    content: (0, utils_1.byteArrayToString)(content),
                    uri,
                    resolve
                });
            });
        }
    }
    watch(uri, options) {
        return new vscode_1.Disposable(() => { });
    }
}
exports.GistFileSystemProvider = GistFileSystemProvider;
function registerFileSystemProvider(store) {
    vscode_1.workspace.registerFileSystemProvider(constants_1.FS_SCHEME, new GistFileSystemProvider(store));
}
//# sourceMappingURL=index.js.map