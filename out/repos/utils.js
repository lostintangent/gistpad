"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openRepoDocument = openRepoDocument;
exports.sanitizeName = sanitizeName;
const vscode_1 = require("vscode");
const fileSystem_1 = require("./fileSystem");
function openRepoDocument(repo, file) {
    const uri = fileSystem_1.RepoFileSystemProvider.getFileUri(repo, file);
    vscode_1.commands.executeCommand("vscode.open", uri);
}
function sanitizeName(name) {
    return name.replace(/\s/g, "-").replace(/[^\w\d-_]/g, "");
}
//# sourceMappingURL=utils.js.map