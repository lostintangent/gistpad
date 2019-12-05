import * as vscode from 'vscode';
import * as config from '../config/config';
import { createUploadMarkup } from './createUploadMarkup';


export const pasteImageMarkup = async (imageMarkup: string, imageMarkupId: string | number) => {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    throw new Error('No active text editor to paste the image.');
  }

  const uploadSetting = await config.get('pasteImageType');
  const isUploading = (uploadSetting === 'file');

  await editor.edit(async (edit) => {
    const { document, selection } = editor;
    const text = document.getText();

    const markup = createUploadMarkup(imageMarkupId, isUploading);

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