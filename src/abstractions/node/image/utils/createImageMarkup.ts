import * as config from "../../../../config";
import { DocumentLanguages } from "../pasteImage";

export async function createImageMarkup(
  imageSrc: string,
  languageId: string,
  imageAlt = "image"
) {
  const htmlMarkup = `<img src="${imageSrc}" alt="${imageAlt}" />`;

  switch (languageId) {
    case DocumentLanguages.markdown:
      const imageOutput = await config.get("image.markdownPasteFormat");
      return imageOutput === DocumentLanguages.markdown
        ? `![${imageAlt}](${imageSrc})`
        : htmlMarkup;
    case DocumentLanguages.pug:
      return `img(src='${imageSrc}', alt='${imageAlt}')`;
    case DocumentLanguages.html:
    default:
      return htmlMarkup;
  }
}
