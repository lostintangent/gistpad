import axios from "axios";
import { runInAction } from "mobx";
import { ZERO_WIDTH_SPACE } from "../constants";
import { Gist, GistFile, store } from "../store";
import { getApi } from "../store/actions";

const isBinaryPath = require("is-binary-path");
export async function getFileContents(file: GistFile) {
  if (file.truncated || !file.content) {
    const responseType = isBinaryPath(file.filename!) ? "arraybuffer" : "text";
    try {
      const { data } = await axios.get(file.raw_url!, {
        responseType,
        transformResponse: (data) => {
          return data;
        }
      });
      file.content = data;
    } catch (error: any) {
      console.error(`Error fetching file content: ${(error as Error).message}`);
      // Fallback: try to fetch content directly from raw_url
      try {
        const response = await fetch(file.raw_url!);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        file.content = await response.text();
      } catch (fallbackError: any) {
        console.error(`Fallback fetch failed: ${(fallbackError as Error).message}`);
        throw new Error(`Failed to fetch file content: ${fallbackError.message}`);
      }
    }
  }

  return file.content!;
}

export async function updateGistFiles(
  id: string,
  gistFiles: Array<[string, GistFile | null]>
): Promise<Gist> {
  const api = await getApi();

  const files = gistFiles.reduce((accumulator, [filename, file]) => {
    if (file && file.content === "") {
      file.content = ZERO_WIDTH_SPACE;
    }

    return {
      ...accumulator,
      [filename]: file
    };
  }, {});

  const { body } = await api.edit(id, { files });

  const gist =
    store.scratchNotes.gist && store.scratchNotes.gist.id === id
      ? store.scratchNotes.gist
      : store.gists.find((gist) => gist.id === id)!;

  runInAction(() => {
    gist.files = body.files;
    gist.updated_at = body.updated_at;
    gist.history = body.history;
  });

  return gist;
}