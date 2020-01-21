import {
  MARKUP_BASE_NAME,
  MARKUP_EXTENSIONS,
  SCRIPT_BASE_NAME,
  SCRIPT_EXTENSIONS,
  STYLESHEET_BASE_NAME,
  STYLESHEET_EXTENSIONS
} from "../commands/constants";
import { PlaygroundFileType } from "../interfaces/PlaygroundTypes";
import { Gist } from "../store";

export const getGistFileOfType = (gist: Gist, fileType: PlaygroundFileType) => {
  let extensions: string[];
  let fileBaseName: string;
  switch (fileType) {
    case PlaygroundFileType.markup:
      extensions = MARKUP_EXTENSIONS;
      fileBaseName = MARKUP_BASE_NAME;
      break;
    case PlaygroundFileType.script:
      extensions = SCRIPT_EXTENSIONS;
      fileBaseName = SCRIPT_BASE_NAME;
      break;
    case PlaygroundFileType.stylesheet:
    default:
      extensions = STYLESHEET_EXTENSIONS;
      fileBaseName = STYLESHEET_BASE_NAME;
      break;
  }

  const fileCandidates = extensions.map(
    (extension) => `${fileBaseName}${extension}`
  );

  return Object.keys(gist.files).find((file) => fileCandidates.includes(file));
};
