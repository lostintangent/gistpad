import * as vscode from "vscode";
import * as config from "../../../config";
import { log } from "../../../logger";
import { pasteImageAsBase64 } from "./pasteImageAsBase64";
import { pasteImageAsFile } from "./pasteImageAsFile";
import { createUploadMarkup } from "./utils/createUploadMarkup";
import { randomInt } from "./utils/randomInt";

export const DocumentLanguages = {
  html: "html",
  markdown: "markdown",
  pug: "jade"
};

async function addUploadingMarkup(
  editor: vscode.TextEditor,
  id: string | number,
  isFilePaste: boolean
) {
  const markup = createUploadMarkup(
    id,
    isFilePaste,
    editor.document.languageId
  );

  await editor.edit((edit) => {
    const current = editor.selection;

    if (current.isEmpty) {
      edit.insert(current.start, markup);
    } else {
      edit.replace(current, markup);
    }
  });
}

async function tryToRemoveUploadingMarkup(
  editor: vscode.TextEditor,
  id: string | number,
  isUploadAsFile: boolean
) {
  try {
    const markup = createUploadMarkup(
      id,
      isUploadAsFile,
      editor.document.languageId
    );

    editor.edit((edit) => {
      const { document } = editor;
      const text = document.getText();

      const index = text.indexOf(markup);
      if (index === -1) {
        throw new Error("No upload markup is found.");
      }

      const startPos = document.positionAt(index);
      const endPos = document.positionAt(index + markup.length);
      const range = new vscode.Selection(startPos, endPos);

      edit.replace(range, "");
    });
  } catch (e) {
    log.error(e);
  }
}

export async function pasteImageCommand(editor: vscode.TextEditor) {
  const imageType = await config.get("image.pasteType");
  const isFilePaste = imageType === "file";

  const imageId = randomInt();
  const addUploadingMarkupPromise = addUploadingMarkup(
    editor,
    imageId,
    isFilePaste
  );

  try {
    if (!isFilePaste) {
      return await pasteImageAsBase64(editor, imageId);
    }

    return await pasteImageAsFile(editor, imageId);
  } catch (e) {
    throw e;
  } finally {
    await addUploadingMarkupPromise;
    await tryToRemoveUploadingMarkup(editor, imageId, isFilePaste);
  }
}
