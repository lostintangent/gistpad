import * as vscode from "vscode";
import { store } from "../../../store";
import { fileNameToUri, getGistDetailsFromUri } from "../../../utils";
import { clipboardToImageBuffer } from "./clipboardToImageBuffer";
import { createImageMarkup } from "./utils/createImageMarkup";
import { pasteImageMarkup } from "./utils/pasteImageMarkup";

function getImageFileName() {
  const dateSting = new Date().toDateString().replace(/\s/g, "_");
  return `${dateSting}_${Date.now()}.png`;
}

export async function pasteImageAsFile(
  editor: vscode.TextEditor,
  imageMarkupId: string | number
) {
  const fileName = getImageFileName();
  const { gistId } = getGistDetailsFromUri(editor.document.uri);
  const imageBits = await clipboardToImageBuffer.getImageBits();

  await vscode.workspace.fs.writeFile(
    fileNameToUri(gistId, fileName),
    imageBits
  );

  const imageSrc = `https://gist.github.com/${store.login}/${gistId}/raw/${fileName}`;
  const imageMarkup = await createImageMarkup(
    imageSrc,
    editor.document.languageId
  );

  await pasteImageMarkup(editor, imageMarkup, imageMarkupId);
}
