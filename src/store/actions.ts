import { observable } from "mobx";
import { window } from "vscode";
import { Gist, GistComment, GistFile, IFollowedUser, store } from ".";
import * as config from "../config";
import { ZERO_WIDTH_SPACE } from "../constants";
import { log } from "../logger";
import { openGist, sortGists } from "../utils";
import { getToken } from "./auth";
import { storage } from "./storage";

const Gists = require("gists");

async function getApi() {
  const token = await getToken();

  if (!token) {
    const message = "No authentication token found.";
    log.error(message);
    throw new Error(message);
  }

  const apiurl = await config.get("apiUrl");

  if (!apiurl) {
    const message = "No API URL is set.";
    log.error(message);
    throw new Error(message);
  }

  return new Gists({ apiurl, token });
}

export async function addGistFiles(id: string, fileNames: string[]) {
  const api = await getApi();

  const files = fileNames
    .map((fileName) => fileName.trim())
    .filter((fileName) => fileName !== "")
    .reduce((accumulator, fileName) => {
      return {
        ...accumulator,
        [fileName]: {
          content: ZERO_WIDTH_SPACE
        }
      };
    }, {});

  const response = await api.edit(id, { files });

  const newGists = store.gists.filter((gist) => gist.id !== id);
  newGists.push(response.body);

  store.gists = sortGists(newGists);
}

export async function changeDescription(id: string, description: string) {
  const api = await getApi();
  await api.edit(id, {
    description
  });

  store.gists.find((gist) => gist.id === id)!.description = description;
}

export async function createGistComment(
  id: string,
  body: string
): Promise<GistComment> {
  const api = await getApi();
  const gist = await api.createComment(id, { body });
  return gist.body;
}

export async function deleteGist(id: string) {
  try {
    const api = await getApi();
    await api.delete(id);
    store.gists = store.gists.filter((gist) => gist.id !== id);
  } catch (e) {
    window.showErrorMessage(e);
  }
}

export async function deleteGistComment(
  gistId: string,
  commentId: string
): Promise<void> {
  const api = await getApi();
  await api.deleteComment(gistId, commentId);
}

export async function editGistComment(
  gistId: string,
  commentId: string,
  body: string
): Promise<void> {
  const api = await getApi();
  await api.editComment(gistId, commentId, { body });
}

export async function followUser(username: string) {
  const followedUsers = storage.followedUsers;

  if (followedUsers.find((user) => user === username)) {
    window.showInformationMessage("You're already following this user");
    return;
  } else {
    followedUsers.push(username);
    storage.followedUsers = followedUsers;
  }

  const user: IFollowedUser = observable({
    username,
    gists: [],
    isLoading: true
  });

  store.followedUsers.push(user);

  user.gists = await listUserGists(username);
  user.isLoading = false;
}

export async function forkGist(id: string) {
  const api = await getApi();

  const gist = await api.fork(id);
  store.gists.unshift(gist.body);
  openGist(gist.body.id);
}

export async function getGist(id: string): Promise<Gist> {
  const api = await getApi();
  const gist = await api.get(id);
  return gist.body;
}

export async function getGistComments(id: string): Promise<GistComment[]> {
  const api = await getApi();
  const response = await api.listComments(id);
  return response.body;
}

export async function listGists(
  sortByDescription: boolean = false
): Promise<Gist[]> {
  const api = await getApi();
  const { pages } = await api.all();
  const gists: Gist[] = await pages.reduce(
    (result: Gist[], page: any) => [...result, ...page.body],
    []
  );

  return sortGists(gists, sortByDescription);
}

export async function listUserGists(username: string): Promise<Gist[]> {
  const api = await getApi();
  const response = await api.list(username);

  return response.body.sort(
    (a: Gist, b: Gist) => Date.parse(b.updated_at) - Date.parse(a.updated_at)
  );
}

export async function newGist(
  gistFiles: GistFile[],
  isPublic: boolean,
  description?: string,
  openAfterCreation: boolean = true
) {
  const api = await getApi();

  const files = gistFiles.reduce((accumulator, gistFile) => {
    return {
      ...accumulator,
      [gistFile.filename!.trim()]: {
        content: gistFile.content || ZERO_WIDTH_SPACE
      }
    };
  }, {});

  const gist = await api.create({
    description,
    public: isPublic,
    files
  });

  store.gists.unshift(gist.body);

  if (openAfterCreation) {
    openGist(gist.body.id, true);
  }

  return gist.body;
}

export async function refreshGists() {
  store.isLoading = true;
  store.gists = await listGists();
  store.starredGists = await starredGists();

  if (storage.followedUsers.length > 0) {
    store.followedUsers = storage.followedUsers.map((username) => ({
      username,
      gists: [],
      isLoading: true
    }));
  }

  store.isLoading = false;

  if (storage.followedUsers.length > 0) {
    for (const followedUser of store.followedUsers) {
      followedUser.gists = await listUserGists(followedUser.username);
      followedUser.isLoading = false;
    }
  }
}

export async function starredGists(): Promise<Gist[]> {
  const api = await getApi();
  const { body } = await api.starred();
  return body;
}

export async function unfollowUser(username: string) {
  storage.followedUsers = storage.followedUsers.filter(
    (user) => user !== username
  );

  store.followedUsers = store.followedUsers.filter(
    (user) => user.username !== username
  );
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

  const newGists = store.gists.filter((gist) => gist.id !== id);
  newGists.push(response.body);

  store.gists = sortGists(newGists);
}

export async function unstarGist(id: string) {
  const api = await getApi();
  await api.unstar(id);

  store.starredGists = store.starredGists.filter((gist) => gist.id !== id);
}
