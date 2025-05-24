"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pasteImageMarkup = void 0;
const vscode = require("vscode");
const config = require("../../../../config");
const createUploadMarkup_1 = require("./createUploadMarkup");
async function pasteImageMarkup(editor, imageMarkup, imageMarkupId) {
    const uploadSetting = config.get("images.pasteType");
    const isUploading = uploadSetting === "file";
    await editor.edit(async (edit) => {
        const { document, selection } = editor;
        const text = document.getText();
        const markup = (0, createUploadMarkup_1.createUploadMarkup)(imageMarkupId, isUploading, document.languageId);
        const index = text.indexOf(markup);
        if (index === -1) {
            edit.insert(selection.start, imageMarkup);
            return;
        }
        const startPos = document.positionAt(index);
        const endPos = document.positionAt(index + markup.length);
        const range = new vscode.Selection(startPos, endPos);
        edit.replace(range, imageMarkup);
    });
}
exports.pasteImageMarkup = pasteImageMarkup;
//# sourceMappingURL=pasteImageMarkup.js.map