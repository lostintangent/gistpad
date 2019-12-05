import * as vscode from 'vscode';
import * as config from '../../../config/config';
import { log } from '../../../logger';
import { createCommand } from '../../../utils/createCommand';
import { createUploadMarkup } from '../../../utils/createUploadMarkup';
import { randomInt } from '../../../utils/randomInt';
import { pasteImageAsBase64 } from './pasteImageAsBase64';
import { pasteImageAsFile } from './pasteImageAsFile';

const tryToRemoveUploadingMarkup = async (id: string | number, isUploadAsFile: boolean) => {
  try {
    const markup = createUploadMarkup(id, isUploadAsFile);

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      throw new Error('No active text editor to paste the image.');
    }

    editor.edit(edit => {
      const { document } = editor;
      const text = document.getText();

      const index = text.indexOf(markup);
      if (index === -1) {
        throw new Error('No upload markup is found.');
      }

      const startPos = document.positionAt(index);
      const endPos = document.positionAt(index + markup.length);
      const range = new vscode.Selection(startPos, endPos);

      edit.replace(range, '');
    });
  } catch (e) {
    log.error(e);
  }
}

const addUploadingMarkup = async (id: string | number) => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    throw new Error('No active text editor to paste the image.');
  }

  const uploadSetting = await config.get('pasteImageType');
  const isUploading = (uploadSetting === 'file');

  const markup = createUploadMarkup(id, isUploading);

  await editor.edit(edit => {
    const current = editor.selection;

    if (current.isEmpty) {
      edit.insert(current.start, markup);
    } else {
      edit.replace(current, markup);
    }
  });
}

export const pasteImageCommand = createCommand(
  async () => {
    const imageType = await config.get('pasteImageType');
    const isUploadAsFile = (imageType === 'file');

    const imageId = randomInt();
    const addUploadingMarkupPromise = addUploadingMarkup(imageId);

    try {
      if (!isUploadAsFile) {
        return await pasteImageAsBase64(imageId);
      }

      return await pasteImageAsFile(imageId);
    } finally {
      await addUploadingMarkupPromise;
      await tryToRemoveUploadingMarkup(imageId, isUploadAsFile)
    }
  }
)
