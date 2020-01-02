import * as vscode from "vscode";
import { clipboardToImageBuffer } from "./clipboardToImageBuffer";
import { createImageMarkup } from "./utils/createImageMarkup";
import { pasteImageMarkup } from "./utils/pasteImageMarkup";

function createBase64ImageSource(imageBits: Buffer) {
  const base64Str = imageBits.toString("base64");
  return `data:image/png;base64,${base64Str}`;
}

export async function pasteImageAsBase64(
  editor: vscode.TextEditor,
  imageMarkupId: string | number
) {
  const imageBits = await clipboardToImageBuffer.getImageBits();
  const base64Image = createBase64ImageSource(imageBits);
  const imageMarkup = await createImageMarkup(
    base64Image,
    editor.document.languageId
  );

  await pasteImageMarkup(editor, imageMarkup, imageMarkupId);
}
