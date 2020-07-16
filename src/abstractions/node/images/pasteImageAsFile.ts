import * as vscode from "vscode";
import { TextEditor } from "vscode";
import * as config from "../../../config";
import { DIRECTORY_SEPARATOR, FS_SCHEME } from "../../../constants";
import { RepoFileSystemProvider } from "../../../repos/fileSystem";
import { store } from "../../../store";
import {
  encodeDirectoryName,
  fileNameToUri,
  getGistDetailsFromUri
} from "../../../utils";
import { clipboardToImageBuffer } from "./clipboardToImageBuffer";
import { createImageMarkup } from "./utils/createImageMarkup";
import { pasteImageMarkup } from "./utils/pasteImageMarkup";

function getImageFileInfo(
  editor: TextEditor,
  fileName: string
): [vscode.Uri, string] {
  switch (editor.document.uri.scheme) {
    case FS_SCHEME: {
      const { gistId } = getGistDetailsFromUri(editor.document.uri);

      const src = `https://gist.github.com/${
        store.login
      }/${gistId}/raw/${encodeDirectoryName(fileName)}`;

      return [fileNameToUri(gistId, fileName), src];
    }
    default: {
      // TODO: Figure out a solution that will work for private repos
      const [repo] = RepoFileSystemProvider.getRepoInfo(editor.document.uri)!;
      const fileUri = RepoFileSystemProvider.getFileUri(repo.name, fileName);
      const src = `https://github.com/${repo.name}/raw/${repo.branch}/${fileName}`;
      return [fileUri, src];
    }
  }
}

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
  const fileName = getImageFileName();
  const imageBits = await clipboardToImageBuffer.getImageBits();

  const [uri, src] = getImageFileInfo(editor, fileName);
  await vscode.workspace.fs.writeFile(uri, imageBits);

  const imageMarkup = await createImageMarkup(src, editor.document.languageId);

  await pasteImageMarkup(editor, imageMarkup, imageMarkupId);
}
