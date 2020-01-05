import axios from "axios";
import { ZERO_WIDTH_SPACE } from "../constants";
import { Gist, GistFile, store } from "../store";
import { getApi } from "../store/actions";

export async function getFileContents(file: GistFile) {
  if (file.truncated || !file.content) {
    const responseType = file.type!.startsWith("image/")
      ? "arraybuffer"
      : "text";
    file.content = (
      await axios.get(file.raw_url!, {
        responseType,
        transformResponse: (data) => {
          return data;
        }
      })
    ).data;
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

  const response = await api.edit(id, { files });

  const newGists = store.gists.filter((gist) => gist.id !== id);
  newGists.push(response.body);

  store.gists = newGists;
  return response.body;
}
