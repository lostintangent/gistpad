"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUploadMarkup = void 0;
const pasteImage_1 = require("../pasteImage");
function createUploadMarkup(id, isUploading, languageId) {
    const pasteDescription = isUploading ? "Uploading" : "Creating";
    const message = `${pasteDescription} image ${id}...`;
    switch (languageId) {
        case pasteImage_1.DocumentLanguages.html:
            return `<!-- ${message} -->`;
        case pasteImage_1.DocumentLanguages.pug:
            return `//- ${message} //`;
        default:
            return `**${message}**`;
    }
}
exports.createUploadMarkup = createUploadMarkup;
//# sourceMappingURL=createUploadMarkup.js.map