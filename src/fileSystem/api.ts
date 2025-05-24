import axios from "axios";
import * as path from "path";
import { runInAction } from "mobx";
import { ZERO_WIDTH_SPACE } from "../constants";
import { Gist, GistFile, store } from "../store";
import { getApi } from "../store/actions";

const isBinaryPath = require("is-binary-path");
export async function getFileContents(file: GistFile) {
  if (file.truncated || !file.content) {
    const responseType = isBinaryPath(path.basename(file.filename!)) ? "arraybuffer" : "text";
    const { data } = await axios.get(file.raw_url!, {
      responseType,
      transformResponse: (data) => {
        return data;
      }
    });

    file.content = data;
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
      : (store.gists.find((gist) => gist.id === id) ||
        store.archivedGists.find((gist) => gist.id === id))!;

  runInAction(() => {
    gist.files = body.files;
    gist.updated_at = body.updated_at;
    gist.history = body.history;
  });

  return gist;
}
