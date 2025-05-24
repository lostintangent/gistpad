"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pasteImageAsBase64 = void 0;
const clipboardToImageBuffer_1 = require("./clipboardToImageBuffer");
const createImageMarkup_1 = require("./utils/createImageMarkup");
const pasteImageMarkup_1 = require("./utils/pasteImageMarkup");
function createBase64ImageSource(imageBits) {
    const base64Str = imageBits.toString("base64");
    return `data:image/png;base64,${base64Str}`;
}
async function pasteImageAsBase64(editor, imageMarkupId) {
    const imageBits = await clipboardToImageBuffer_1.clipboardToImageBuffer.getImageBits();
    const base64Image = createBase64ImageSource(imageBits);
    const imageMarkup = await (0, createImageMarkup_1.createImageMarkup)(base64Image, editor.document.languageId);
    await (0, pasteImageMarkup_1.pasteImageMarkup)(editor, imageMarkup, imageMarkupId);
}
exports.pasteImageAsBase64 = pasteImageAsBase64;
//# sourceMappingURL=pasteImageAsBase64.js.map