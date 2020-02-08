import { observable } from "mobx";
import * as path from "path";
import { Uri } from "vscode";
import { TEMP_GIST_ID } from "../constants";
import { Gist, GistFile, store } from "../store";
import { byteArrayToString, stringToByteArray } from "../utils";

function fileNameFromUri(uri: Uri) {
  return path.basename(uri.toString());
}

function getTempGist() {
  return store.gists.find((gist) => gist.id === TEMP_GIST_ID)!;
}

function markGistAsUpdated(gist: Gist) {
  gist.updated_at = new Date().toISOString();
}

export function readFile(uri: Uri) {
  const gist = getTempGist();
  const file = gist.files[fileNameFromUri(uri)];
  return stringToByteArray(file.content!);
}

export function writeFile(uri: Uri, content: Uint8Array) {
  const gist = getTempGist();
  const filename = fileNameFromUri(uri);
  const stringContent = byteArrayToString(content);

  const file = gist.files[filename];

  if (file) {
    file.content = stringContent;
  } else {
    gist.files[filename] = {
      filename,
      content: stringContent
    };
  }

  markGistAsUpdated(gist);
}

export function deleteFile(uri: Uri) {
  const gist = getTempGist();
  delete gist.files[fileNameFromUri(uri)];
  markGistAsUpdated(gist);
}

export function renameFile(oldUri: Uri, newUri: Uri) {
  const gist = getTempGist();
  const filename = fileNameFromUri(newUri);
  gist.files[filename] = {
    ...gist.files[fileNameFromUri(oldUri)],
    filename
  };

  deleteFile(oldUri);
}

export async function newTempGist(
  gistFiles: GistFile[],
  isPublic: boolean,
  description?: string
): Promise<Gist> {
  let files: { [fileName: string]: GistFile } = {};
  gistFiles.forEach((file) => {
    files[file.filename!] = file;
  });

  return observable({
    id: TEMP_GIST_ID,
    files,
    html_url: "",
    truncated: false,
    url: "",
    description: description!,
    owner: {
      id: 1,
      login: "",
      avatar_url: "",
      html_url: ""
    },
    public: isPublic,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    history: [],
    git_pull_url: ""
  });
}
