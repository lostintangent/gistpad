import { observable, runInAction } from "mobx";
import { window, workspace } from "vscode";
import { FollowedUser, Gist, GistComment, GistFile, store } from ".";
import * as config from "../config";
import { ZERO_WIDTH_SPACE } from "../constants";
import { log } from "../logger";
import {
  byteArrayToString,
  fileNameToUri,
  openGistFiles,
  sortGists
} from "../utils";
import { getToken } from "./auth";
import { storage } from "./storage";

const Gists = require("gists");

const GISTPAD_GH_TOKEN = "9a46e8821658e79ea796741fbddbf13846fcd916";

interface ApiOptions {
  apiConstructor?: any;
  useDefaultToken?: boolean;
}

export async function getApi(
  opts: ApiOptions = { apiConstructor: Gists, useDefaultToken: false }
) {
  if (!opts.apiConstructor) {
    opts.apiConstructor = Gists;
  }

  let token = await getToken();

  if (opts.useDefaultToken) {
    token = GISTPAD_GH_TOKEN;
  }

  const apiurl = config.get("apiUrl");

  if (!apiurl) {
    const message = "No API URL is set.";
    log.error(message);
    throw new Error(message);
  }

  return new opts.apiConstructor({ apiurl, token });
}

export async function duplicateGist(
  id: string,
  isPublic: boolean = true,
  description?: string
) {
  const gist = await getGist(id);
  const files = [];
  for (const filename of Object.keys(gist.files)) {
    const content = byteArrayToString(
      await workspace.fs.readFile(fileNameToUri(gist.id, filename))
    );
    files.push({
      filename,
      content
    });
  }

  newGist(files, isPublic, description || gist.description);
}

export async function getUser(username: string) {
  const GitHub = require("github-base");
  const api = await getApi({ apiConstructor: GitHub });

  try {
    const response = await api.get(`/users/${username}`);
    return response.body;
  } catch (e) {
    return null;
  }
}

export async function getUserAvatar(username: string) {
  const user = await getUser(username);
  return user ? user.avatar_url : null;
}

export async function changeDescription(id: string, description: string) {
  const api = await getApi();
  const { body } = await api.edit(id, {
    description
  });

  const gist = store.gists.find((gist) => gist.id === id)!;

  runInAction(() => {
    gist.description = body.description;
    gist.updated_at = body.updated_at;
  });
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
  const avatarUrl = await getUserAvatar(username);
  if (!avatarUrl) {
    window.showErrorMessage(
      `"${username}" doesn't appear to be a valid GitHub user. Please try again.`
    );
    return;
  }

  const followedUsers = storage.followedUsers;
  if (followedUsers.find((user) => user === username)) {
    window.showInformationMessage("You're already following this user");
    return;
  } else {
    followedUsers.push(username);
    storage.followedUsers = followedUsers;
  }

  const user: FollowedUser = observable({
    username,
    avatarUrl,
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

  openGistFiles(gist.body.id);
}

export async function getGist(id: string): Promise<Gist> {
  let useDefaultToken = false;
  if (store.newTempGist?.id === id) {
    useDefaultToken = true;
  }

  const api = await getApi({ useDefaultToken });
  const gist = await api.get(id);
  return gist.body;
}

export async function getGistComments(id: string): Promise<GistComment[]> {
  let useDefaultToken = false;
  if (store.newTempGist?.id === id) {
    useDefaultToken = true;
  }

  const api = await getApi({ useDefaultToken });
  const response = await api.listComments(id);
  return response.body;
}

export async function listGists(): Promise<Gist[]> {
  const api = await getApi();
  const { pages } = await api.all();
  const gists: Gist[] = await pages.reduce(
    (result: Gist[], page: any) => [...result, ...page.body],
    []
  );

  return sortGists(gists);
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
  const { isSignedIn } = store;
  const api = await getApi({ useDefaultToken: !isSignedIn });

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

  if (isSignedIn) {
    store.gists.unshift(gist.body);
  } else {
    // This is a temp gist
    store.newTempGist = gist.body;
  }

  if (openAfterCreation) {
    openGistFiles(gist.body.id);
  }

  return gist.body;
}

export async function refreshGists() {
  store.isLoading = true;

  await runInAction(async () => {
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
        followedUser.avatarUrl = await getUserAvatar(followedUser.username);
        followedUser.gists = await listUserGists(followedUser.username);
        followedUser.isLoading = false;
      }
    }
  });
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

export async function refreshGist(id: string) {
  const gist = await getGist(id);
  const newGists = store.gists.filter((gist) => gist.id !== id);
  newGists.push(gist);

  store.gists = newGists;
}

export async function starGist(gist: Gist) {
  const api = await getApi();
  await api.star(gist.id);

  store.starredGists.push(gist);
}

export async function unstarGist(id: string) {
  const api = await getApi();
  await api.unstar(id);

  store.starredGists = store.starredGists.filter((gist) => gist.id !== id);
}
