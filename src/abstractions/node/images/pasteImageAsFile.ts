import * as vscode from "vscode";
import * as config from "../../../config";
import { DIRECTORY_SEPARATOR } from "../../../constants";
import { store } from "../../../store";
import {
  encodeDirectoryName,
  fileNameToUri,
  getGistDetailsFromUri
} from "../../../utils";
import { clipboardToImageBuffer } from "./clipboardToImageBuffer";
import { createImageMarkup } from "./utils/createImageMarkup";
import { pasteImageMarkup } from "./utils/pasteImageMarkup";

function getImageFileName() {
  const uploadDirectory = config.get("images.directoryName");
  const prefix = uploadDirectory
    ? `${uploadDirectory}${DIRECTORY_SEPARATOR}`
    : "";

  const dateSting = new Date().toDateString().replace(/\s/g, "_");
  return `${prefix}${dateSting}_${Date.now()}.png`;
}

export async function pasteImageAsFile(
  editor: vscode.TextEditor,
  imageMarkupId: string | number
) {
  const { gistId } = getGistDetailsFromUri(editor.document.uri);
  const fileName = getImageFileName();

  const imageBits = await clipboardToImageBuffer.getImageBits();

  await vscode.workspace.fs.writeFile(
    fileNameToUri(gistId, fileName),
    imageBits
  );

  const imageSrc = `https://gist.github.com/${
    store.login
  }/${gistId}/raw/${encodeDirectoryName(fileName)}`;

  const imageMarkup = await createImageMarkup(
    imageSrc,
    editor.document.languageId
  );

  await pasteImageMarkup(editor, imageMarkup, imageMarkupId);
}
