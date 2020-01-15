import axios from "axios";
import { runInAction } from "mobx";
import { ZERO_WIDTH_SPACE } from "../constants";
import { Gist, GistFile, store } from "../store";
import { getApi } from "../store/actions";

const isBinaryPath = require("is-binary-path");
export async function getFileContents(file: GistFile) {
  if (file.truncated || !file.content) {
    const responseType = isBinaryPath(file.filename!) ? "arraybuffer" : "text";
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
  gistId: string,
  gistFiles: Array<[string, GistFile | null]>
): Promise<Gist> {
  const isNewTempGist = gistId === store.newTempGist?.id;
  const api = await getApi({ useDefaultToken: isNewTempGist });

  const files = gistFiles.reduce((accumulator, [filename, file]) => {
    if (file && file.content === "") {
      file.content = ZERO_WIDTH_SPACE;
    }

    return {
      ...accumulator,
      [filename]: file
    };
  }, {});

  const { body } = await api.edit(gistId, { files });
  const gist = isNewTempGist
    ? store.newTempGist!
    : store.gists.find((gist) => gist.id === gistId)!;

  runInAction(() => {
    gist.files = body.files;
    gist.updated_at = body.updated_at;
    gist.history = body.history;
  });

  return gist;
}
