import { DocumentLanguages } from "../pasteImage";

export function createUploadMarkup(
  id: string | number,
  isUploading: boolean,
  languageId: string
) {
  const pasteDescription = isUploading ? "Uploading" : "Creating";
  const message = `${pasteDescription} image ${id}...`;

  switch (languageId) {
    case DocumentLanguages.html:
      return `<!-- ${message} -->`;
    case DocumentLanguages.pug:
      return `//- ${message} //`;
    default:
      return `**${message}**`;
  }
}
