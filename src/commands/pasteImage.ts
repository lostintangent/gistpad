// const git = require('simple-git/promise');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as git from 'simple-git/promise';
import { commands, ExtensionContext, window, workspace } from "vscode";
import { EXTENSION_ID } from "../constants";
import { createMDImage, Paster } from "../pasteImage/pasteImage";
import { listGists } from "../store/actions";
import { getToken } from '../store/auth';


const pasteImageCommand = async () => {
  try {
    const imageBits = await Paster.getImageFromClipboard();
    const editor = window.activeTextEditor;

    if (!editor) {
      throw new Error('You must open a file to paste the image to.');
    }

    const imageMarkup = createMDImage(imageBits);

    editor.edit(edit => {
      const current = editor.selection;

      if (current.isEmpty) {
        edit.insert(current.start, imageMarkup);
      } else {
        edit.replace(current, imageMarkup);
      }
    });
  } catch (e) {
    console.log(e);
  }
}

const pasteImageCommandAsFile = async () => {
  try {
    const imageBits = await Paster.getImageFromClipboard();
    const editor = window.activeTextEditor;

    if (!editor) {
      throw new Error('You must open a file to paste the image to. [editor]');
    }

    const fileUri = editor.document.uri;

    if (!fileUri) {
      throw new Error('You must open a file to paste the image to.');
    }

    const currentFileStat = await workspace.fs.stat(fileUri);

    if (!currentFileStat) {
      throw new Error('No current fiule found.');
    }

    const gistId = fileUri.authority;

    const gists = await listGists();

    const gist = gists.find((gist) => gist.id === gistId);

    if (!gist) {
      throw new Error('No gist found.');
    }

    const { login } = gist.owner;
    const token = await getToken();

    const remote = `https://${login}:${token}@gist.github.com/${gistId}.git`;

    const repoPath = path.join(os.tmpdir(), gist.id);

    const isRepoExists = fs.existsSync(repoPath);

    if (isRepoExists) {
      const existingRepo = git(repoPath);
      const isRepo = await existingRepo.checkIsRepo();
      if (isRepo) {
        await existingRepo.pull();
      }
    } else {
      await git(os.tmpdir()).silent(true).clone(remote);
    }



    const dateSting = new Date()
      .toDateString()
      .replace(/\s/g, '_');

    const fileName = `[zzzzz]_${dateSting}_${Date.now()}.png`;
    const filePath = path.join(repoPath, fileName);
    fs.writeFileSync(filePath, imageBits);

    const repo = git(repoPath);

    await repo.add([filePath]);
    await repo.commit(`Adding ${fileName}`);
    await repo.push(remote, 'master');

    const imageMarkup = `![img](https://gist.github.com/${login}/${gistId}/raw/${fileName})`;

    editor.edit(edit => {
      const current = editor.selection;

      if (current.isEmpty) {
        edit.insert(current.start, imageMarkup);
      } else {
        edit.replace(current, imageMarkup);
      }
    });

  } catch (e) {
    console.log(e);
  }
}

export async function registerPasteImageCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_ID}.pasteImage`, pasteImageCommand),
    commands.registerCommand(`${EXTENSION_ID}.pasteImageAsFile`, pasteImageCommandAsFile)
  );
}
