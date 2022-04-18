import { observable, runInAction, set } from "mobx";
import { window, workspace } from "vscode";
import { FollowedUser, Gist, GistComment, GistFile, store } from ".";
import * as config from "../config";
import {
  DIRECTORY_SEPARATOR,
  SCRATCH_GIST_NAME,
  ZERO_WIDTH_SPACE
} from "../constants";
import {
  byteArrayToString,
  closeGistFiles,
  encodeDirectoryName,
  fileNameToUri,
  openGistFiles,
  sortGists,
  stringToByteArray,
  updateGistTags,
  withProgress
} from "../utils";
import { getToken } from "./auth";
import { storage } from "./storage";
import moment = require("moment");

const Gists = require("gists");

export async function getApi(constructor = Gists) {
  const token = await getToken();
  return new constructor({ token });
}

export async function duplicateGist(
  id: string,
  isPublic: boolean = true,
  description?: string,
  saveGist: boolean = true
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

  return newGist(files, isPublic, description || gist.description, true);
}

export async function getUser(username: string) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

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

  updateGistTags(gist);
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
  const api = await getApi();
  await api.delete(id);
  store.gists = store.gists.filter((gist) => gist.id !== id);
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

  user.gists = await updateGistTags(await listUserGists(username));
  user.isLoading = false;
}

export async function forkGist(id: string) {
  const api = await getApi();

  const gist = await api.fork(id);
  updateGistTags(gist.body);

  store.gists.unshift(gist.body);

  openGistFiles(gist.body.id);
}

export async function getForks(id: string) {
  const api = await getApi();
  const response = await api.forks(id);

  return response.body.sort(
    (a: Gist, b: Gist) => Date.parse(b.updated_at) - Date.parse(a.updated_at)
  );
}

export async function getGist(id: string): Promise<Gist> {
  const api = await getApi();
  const gist = await api.get(id);
  return observable(gist.body);
}

export async function getGists(ids: string[]): Promise<Gist[]> {
  return Promise.all(ids.map(getGist));
}

export async function getGistComments(id: string): Promise<GistComment[]> {
  const api = await getApi();
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
  // api.list unfortunately does not support pagination (it does support page size but it only returns the first page),
  // we need to call the GitHub API directly
  // https://docs.github.com/en/rest/reference/gists#list-public-gists
  // @investigate: should we cap how many gists are fetched and provide a way to load more? It theory, users with hundreds of gists could be problematic to handle if we try to load all gists at once
  const GitHub = require("github-base");
  const api = await getApi(GitHub);
  let page = 1;
  let responseBody: any[] = [];
  let getNextPage = true;
  let linkIndex = 0;

  while (getNextPage) {
    const response = await api.get(
      `/users/${username}/gists?per_page=100&page=${page}`
    );

    responseBody = [...responseBody, ...response.body];

    if (responseBody.length === 0) {
      getNextPage = false;
    }

    page++;

    linkIndex = response.rawHeaders.indexOf("Link") + 1;
    let nextIndex = response.rawHeaders[linkIndex].indexOf('rel="next"');
    if (nextIndex === -1) {
      getNextPage = false;
    }
  }

  return responseBody.sort(
    (a: Gist, b: Gist) => Date.parse(b.updated_at) - Date.parse(a.updated_at)
  );
}

export async function newGist(
  gistFiles: GistFile[],
  isPublic: boolean,
  description?: string,
  openAfterCreation: boolean = true
): Promise<Gist> {
  const api = await getApi();

  const files = gistFiles.reduce((accumulator, gistFile) => {
    return {
      ...accumulator,
      [gistFile.filename!.trim()]: {
        content: gistFile.content || ZERO_WIDTH_SPACE
      }
    };
  }, {});

  const rawGist = await api.create({
    description,
    public: isPublic,
    files
  });
  const gist = rawGist.body;

  updateGistTags(gist);

  store.gists.unshift(gist);

  if (openAfterCreation) {
    openGistFiles(gist.id);
  }

  return gist;
}

export async function newScratchNote(displayProgress: boolean = true) {
  const directoryFormat = config.get("scratchNotes.directoryFormat");
  const fileFormat = config.get("scratchNotes.fileFormat");
  const extension = config.get("scratchNotes.fileExtension");

  const sharedMoment = moment();
  const directory = directoryFormat
    ? `${sharedMoment.format(directoryFormat)}${DIRECTORY_SEPARATOR}`
    : "";

  const file = sharedMoment.format(fileFormat);

  const filename = `${directory}${file}${extension}`;

  if (!store.scratchNotes.gist) {
    const api = await getApi();
    const response = await api.create({
      description: SCRATCH_GIST_NAME,
      public: false,
      files: {
        [encodeDirectoryName(filename)]: {
          content: ZERO_WIDTH_SPACE
        }
      }
    });

    store.scratchNotes.gist = response.body;
  } else if (!store.scratchNotes.gist.files.hasOwnProperty(filename)) {
    const writeFile = async () =>
      workspace.fs.writeFile(
        fileNameToUri(store.scratchNotes.gist!.id, filename),
        stringToByteArray("")
      );

    if (displayProgress) {
      await withProgress("Creating scratch note...", writeFile);
    } else {
      await writeFile();
    }
  }

  const uri = fileNameToUri(store.scratchNotes.gist!.id, filename);
  window.showTextDocument(uri);
}

export async function clearScratchNotes() {
  const api = await getApi();
  await api.delete(store.scratchNotes.gist!.id);

  closeGistFiles(store.scratchNotes.gist!);
  store.scratchNotes.gist = null;
}

export async function refreshGists() {
  store.isLoading = true;

  const gists = updateGistTags(await listGists());
  store.scratchNotes.gist =
    gists.find((gist) => gist.description === SCRATCH_GIST_NAME) || null;

  store.gists = store.scratchNotes.gist
    ? gists.filter((gist) => gist.description !== SCRATCH_GIST_NAME)
    : gists;

  store.isLoading = false;

  store.starredGists = updateGistTags(await starredGists());

  if (storage.followedUsers.length > 0) {
    store.followedUsers = storage.followedUsers.map((username) => ({
      username,
      gists: [],
      isLoading: true
    }));

    for (const followedUser of store.followedUsers) {
      followedUser.avatarUrl = await getUserAvatar(followedUser.username);
      followedUser.gists = updateGistTags(
        await listUserGists(followedUser.username)
      );
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

export async function refreshGist(id: string) {
  const gist = await getGist(id);
  const oldGist = store.gists.find((gist) => gist.id === id);
  set(oldGist!, gist);
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
