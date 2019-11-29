import { ProgressLocation, window } from "vscode";
import { Gist, GistFile, store } from ".";
import { ZERO_WIDTH_SPACE } from "../constants";
import { openGist } from "../utils";
import { getToken } from "./auth";

const Gists = require("gists");

async function getApi() {
  const token = await getToken();
  return new Gists({ token });
}

export async function addGistFiles(id: string, fileNames: string[]) {
  const api = await getApi();

  const files = fileNames
    .map(fileName => fileName.trim())
    .filter(fileName => fileName !== "")
    .reduce((accumulator, fileName) => {
      return {
        ...accumulator,
        [fileName]: {
          content: ZERO_WIDTH_SPACE
        }
      };
    }, {});

  const response = await api.edit(id, { files });

  store.gists = store.gists.filter(gist => gist.id !== id);
  store.gists.push(response.body);
}

export async function changeDescription(id: string, description: string) {
  const api = await getApi();
  await api.edit(id, {
    description
  });

  store.gists.find(gist => gist.id === id)!.description = description;
}

export async function deleteGist(id: string) {
  try {
    const api = await getApi();
    await api.delete(id);
    store.gists = store.gists.filter(gist => gist.id !== id);
  } catch (e) {
    window.showErrorMessage(e);
  }
}

export async function forkGist(id: string) {
  try {
    const api = await getApi();

    window.withProgress(
      { location: ProgressLocation.Notification, title: "Forking Gist..." },
      async () => {
        const gist = await api.fork(id);
        store.gists.push(gist.body);
        openGist(gist.body.id);
      }
    );
  } catch (e) {
    window.showErrorMessage(e);
  }
}

export async function getGist(id: string): Promise<Gist> {
  const api = await getApi();
  const gist = await api.get(id);
  return gist.body;
}

export async function listGists(): Promise<Gist[]> {
  const api = await getApi();
  const { pages } = await api.all();
  return pages.reduce(
    (result: Gist[], page: any) => [...result, ...page.body],
    []
  );
}

export async function newGist(
  fileNames: string[],
  isPublic: boolean,
  description?: string
) {
  const api = await getApi();

  const files = fileNames
    .map(fileName => fileName.trim())
    .filter(fileName => fileName !== "")
    .reduce((accumulator, fileName) => {
      return {
        ...accumulator,
        [fileName]: {
          content: ZERO_WIDTH_SPACE
        }
      };
    }, {});

  const gist = await api.create({
    description,
    public: isPublic,
    files
  });

  store.gists.push(gist.body);
  openGist(gist.body.id, true);
}

export async function refreshGists() {
  store.isLoading = true;
  store.gists = await listGists();
  store.starredGists = await starredGists();
  store.isLoading = false;
}

export async function starredGists(): Promise<Gist[]> {
  const api = await getApi();
  const { body } = await api.starred();
  return body;
}

export async function updateGist(
  id: string,
  filename: string,
  file: GistFile | null
) {
  const api = await getApi();
  const response = await api.edit(id, {
    files: {
      [filename]: file
    }
  });

  store.gists = store.gists.filter(gist => gist.id !== id);
  store.gists.push(response.body);
}

export async function unstarGist(id: string) {
  const api = await getApi();
  await api.unstar(id);

  store.starredGists = store.starredGists.filter(gist => gist.id !== id);
}
