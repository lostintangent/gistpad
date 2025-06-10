"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentLanguages = void 0;
exports.pasteImageCommand = pasteImageCommand;
const vscode = require("vscode");
const config = require("../../../config");
const pasteImageAsBase64_1 = require("./pasteImageAsBase64");
const pasteImageAsFile_1 = require("./pasteImageAsFile");
const createUploadMarkup_1 = require("./utils/createUploadMarkup");
const randomInt_1 = require("./utils/randomInt");
exports.DocumentLanguages = {
    html: "html",
    markdown: "markdown",
    pug: "jade"
};
async function addUploadingMarkup(editor, id, isFilePaste) {
    const markup = (0, createUploadMarkup_1.createUploadMarkup)(id, isFilePaste, editor.document.languageId);
    await editor.edit((edit) => {
        const current = editor.selection;
        if (current.isEmpty) {
            edit.insert(current.start, markup);
        }
        else {
            edit.replace(current, markup);
        }
    });
}
async function tryToRemoveUploadingMarkup(editor, id, isUploadAsFile) {
    try {
        const markup = (0, createUploadMarkup_1.createUploadMarkup)(id, isUploadAsFile, editor.document.languageId);
        editor.edit((edit) => {
            const { document } = editor;
            const text = document.getText();
            const index = text.indexOf(markup);
            if (index === -1) {
                throw new Error("No upload markup is found.");
            }
            const startPos = document.positionAt(index);
            const endPos = document.positionAt(index + markup.length);
            const range = new vscode.Selection(startPos, endPos);
            edit.replace(range, "");
        });
    }
    catch { }
}
async function pasteImageCommand(editor) {
    const imageType = config.get("images.pasteType");
    const isFilePaste = imageType === "file";
    const imageId = (0, randomInt_1.randomInt)();
    const addUploadingMarkupPromise = addUploadingMarkup(editor, imageId, isFilePaste);
    try {
        if (!isFilePaste) {
            return await (0, pasteImageAsBase64_1.pasteImageAsBase64)(editor, imageId);
        }
        return await (0, pasteImageAsFile_1.pasteImageAsFile)(editor, imageId);
    }
    catch (e) {
        vscode.window.showErrorMessage("There doesn't appear to be an image on your clipboard. Copy an image and try again.");
    }
    finally {
        await addUploadingMarkupPromise;
        await tryToRemoveUploadingMarkup(editor, imageId, isFilePaste);
    }
}
//# sourceMappingURL=pasteImage.js.map