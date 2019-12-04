import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as git from 'simple-git/promise';
import * as vscode from 'vscode';
import { listGists } from "../../../store/actions";
import { getToken } from '../../../store/auth';
import { createImageMarkup } from '../../../utils/createImageMarkup';
import { pasteImageMarkup } from '../../../utils/pasteImageMarkup';
import { clipboardToImageBuffer } from './clipboardToImageBuffer';

const getGist = async (gistId: string) => {
  const gists = await listGists();

  const gist = gists.find((gist) => gist.id === gistId);

  return gist;
}

const ensureRepo = async (repoPath: string, remote: string) => {
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
}

const getImageFileName = () => {
  const dateSting = new Date()
    .toDateString()
    .replace(/\s/g, '_');

  const fileName = `${dateSting}_${Date.now()}.png`;

  return fileName;
}

const addFileToRepoAndPush = async (repoPath: string, filePath: string, remote: string) => {
  const fileName = filePath.split(/[\\\/]/).pop();
  const repo = git(repoPath);

  await repo.add([filePath]);
  await repo.commit(`Adding ${fileName}`);
  await repo.push(remote, 'master');
}

export const pasteImageAsFile = async (imageMarkupId: string | number) => {
  const imageBits = await clipboardToImageBuffer.getImageBits();
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    throw new Error('You must open a file to paste the image to. [editor]');
  }

  const fileUri = editor.document.uri;

  if (!fileUri) {
    throw new Error('You must open a file to paste the image to.');
  }

  const currentFileStat = await vscode.workspace.fs.stat(fileUri);

  if (!currentFileStat) {
    throw new Error('No current file found.');
  }

  const gistId = fileUri.authority;
  const gist = await getGist(gistId);

  if (!gist) {
    throw new Error('No gist found.');
  }

  const { login } = gist.owner;
  const token = await getToken();

  if (!token) {
    throw new Error('Sign in first.');
  }

  const remote = `https://${login}:${token}@gist.github.com/${gistId}.git`;

  const repoPath = path.join(os.tmpdir(), gist.id);
  await ensureRepo(repoPath, remote);

  const fileName = getImageFileName();
  const filePath = path.join(repoPath, fileName);
  fs.writeFileSync(filePath, imageBits);

  await addFileToRepoAndPush(repoPath, filePath, remote);

  const imageSrc = `https://gist.github.com/${login}/${gistId}/raw/${fileName}`;
  const imageMarkup = await createImageMarkup(imageSrc);

  pasteImageMarkup(imageMarkup, imageMarkupId);
}
