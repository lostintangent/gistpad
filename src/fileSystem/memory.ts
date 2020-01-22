import { Uri } from "vscode";
import { TEMP_GIST_ID } from "../constants";
import { Gist, GistFile } from "../store";
import { fileNameToUri, stringToByteArray } from "../utils";

interface InMemoryFileContents {
  [uri: string]: Uint8Array;
}

class InMemoryFS {
  fileContents: InMemoryFileContents = {};

  readFile(uri: Uri) {
    return this.fileContents[uri.toString()];
  }

  writeFile(uri: Uri, content: Uint8Array) {
    this.fileContents[uri.toString()] = content;
  }

  delete(uri: Uri) {
    delete this.fileContents[uri.toString()];
  }

  rename(oldUri: Uri, newUri: Uri) {
    this.fileContents[newUri.toString()] = this.fileContents[oldUri.toString()];
    this.delete(oldUri);
  }
}

export const inMemoryFs = new InMemoryFS();

export async function newGistInMemory(
  gistFiles: GistFile[],
  isPublic: boolean,
  description?: string
): Promise<Gist> {
  let files: { [fileName: string]: GistFile } = {};

  gistFiles.forEach((file) => {
    const fileUri = fileNameToUri(TEMP_GIST_ID, file.filename!);
    const contents = stringToByteArray(file.content!);
    inMemoryFs.writeFile(fileUri, contents);
    files[file.filename!] = file;
  });

  return {
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
  };
}
