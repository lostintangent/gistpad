import * as vscode from "vscode";
import * as config from "../../../../config";
import { createUploadMarkup } from "./createUploadMarkup";

export async function pasteImageMarkup(
  editor: vscode.TextEditor,
  imageMarkup: string,
  imageMarkupId: string | number
) {
  const uploadSetting = config.get("images.pasteType");
  const isUploading = uploadSetting === "file";

  await editor.edit(async (edit) => {
    const { document, selection } = editor;
    const text = document.getText();

    const markup = createUploadMarkup(
      imageMarkupId,
      isUploading,
      document.languageId
    );

    const index = text.indexOf(markup);
    if (index === -1) {
      edit.insert(selection.start, imageMarkup);

      return;
    }

    const startPos = document.positionAt(index);
    const endPos = document.positionAt(index + markup.length);
    const range = new vscode.Selection(startPos, endPos);

    edit.replace(range, imageMarkup);
  });
}
