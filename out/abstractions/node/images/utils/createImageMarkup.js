"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createImageMarkup = createImageMarkup;
const config = require("../../../../config");
const pasteImage_1 = require("../pasteImage");
async function createImageMarkup(imageSrc, languageId, imageAlt = "image") {
    const htmlMarkup = `<img src="${imageSrc}" alt="${imageAlt}" />`;
    switch (languageId) {
        case pasteImage_1.DocumentLanguages.markdown:
            const imageOutput = config.get("images.markdownPasteFormat");
            return imageOutput === pasteImage_1.DocumentLanguages.markdown
                ? `![${imageAlt}](${imageSrc})`
                : htmlMarkup;
        case pasteImage_1.DocumentLanguages.pug:
            return `img(src='${imageSrc}', alt='${imageAlt}')`;
        case pasteImage_1.DocumentLanguages.html:
        default:
            return htmlMarkup;
    }
}
//# sourceMappingURL=createImageMarkup.js.map