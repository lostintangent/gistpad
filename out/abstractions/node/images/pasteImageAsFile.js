"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pasteImageAsFile = pasteImageAsFile;
const vscode = require("vscode");
const config = require("../../../config");
const constants_1 = require("../../../constants");
const fileSystem_1 = require("../../../repos/fileSystem");
const store_1 = require("../../../store");
const utils_1 = require("../../../utils");
const clipboardToImageBuffer_1 = require("./clipboardToImageBuffer");
const createImageMarkup_1 = require("./utils/createImageMarkup");
const pasteImageMarkup_1 = require("./utils/pasteImageMarkup");
function getImageFileInfo(editor, fileName) {
    switch (editor.document.uri.scheme) {
        case constants_1.FS_SCHEME: {
            const { gistId } = (0, utils_1.getGistDetailsFromUri)(editor.document.uri);
            const src = `https://gist.github.com/${store_1.store.login}/${gistId}/raw/${(0, utils_1.encodeDirectoryName)(fileName)}`;
            return [(0, utils_1.fileNameToUri)(gistId, fileName), src];
        }
        default: {
            // TODO: Figure out a solution that will work for private repos
            const [repo] = fileSystem_1.RepoFileSystemProvider.getRepoInfo(editor.document.uri);
            const fileUri = fileSystem_1.RepoFileSystemProvider.getFileUri(repo.name, fileName);
            const src = `https://github.com/${repo.name}/raw/${repo.branch}/${fileName}`;
            return [fileUri, src];
        }
    }
}
function getImageFileName() {
    const uploadDirectory = config.get("images.directoryName");
    const prefix = uploadDirectory
        ? `${uploadDirectory}${constants_1.DIRECTORY_SEPARATOR}`
        : "";
    const dateSting = new Date().toDateString().replace(/\s/g, "_");
    return `${prefix}${dateSting}_${Date.now()}.png`;
}
async function pasteImageAsFile(editor, imageMarkupId) {
    const fileName = getImageFileName();
    const imageBits = await clipboardToImageBuffer_1.clipboardToImageBuffer.getImageBits();
    const [uri, src] = getImageFileInfo(editor, fileName);
    try {
        await vscode.workspace.fs.writeFile(uri, imageBits);
    }
    catch (err) {
        // TODO: fs.writeFile gives an error which prevents pasting images from the clipboard
        // Error (FileSystemError): Unable to write file 'gist://Gist_ID/images/imageName.png'
        // (Error: [mobx] 'set()' can only be used on observable objects, arrays and maps)
    }
    const imageMarkup = await (0, createImageMarkup_1.createImageMarkup)(src, editor.document.languageId);
    await (0, pasteImageMarkup_1.pasteImageMarkup)(editor, imageMarkup, imageMarkupId);
}
//# sourceMappingURL=pasteImageAsFile.js.map