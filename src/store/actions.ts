import { observable, runInAction, set } from "mobx";
import { window, workspace } from "vscode";
import { FollowedUser, Gist, GistComment, GistFile, store } from ".";
import * as config from "../config";
import {
  DAILY_GIST_NAME,
  DAILY_TEMPLATE_FILENAME,
  DIRECTORY_SEPARATOR,
  ZERO_WIDTH_SPACE
} from "../constants";
import {
  byteArrayToString,
  closeGistFiles,
  encodeDirectoryName,
  fileNameToUri,
  isArchivedGist,
  openGistFiles,
  sortGists,
  stringToByteArray,
  updateGistTags,
  withProgress
} from "../utils";
import { getToken } from "./auth";
import { followedUsersStorage } from "./storage";
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

  const gist =
    store.gists.find((gist) => gist.id === id)! ||
    store.archivedGists.find((gist) => gist.id === id)!;

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
  store.archivedGists = store.archivedGists.filter((gist) => gist.id !== id);
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

  const followedUsers = followedUsersStorage.followedUsers;
  if (followedUsers.find((user) => user === username)) {
    window.showInformationMessage("You're already following this user");
    return;
  } else {
    followedUsers.push(username);
    followedUsersStorage.followedUsers = followedUsers;
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

export async function openTodayNote(displayProgress: boolean = true) {
  const directoryFormat = config.get("dailyNotes.directoryFormat");
  const fileFormat = config.get("dailyNotes.fileFormat");
  const extension = config.get("dailyNotes.fileExtension");

  const sharedMoment = moment();
  const directory = directoryFormat
    ? `${sharedMoment.format(directoryFormat)}${DIRECTORY_SEPARATOR}`
    : "";

  const file = sharedMoment.format(fileFormat);
  const filename = `${directory}${file}${extension}`;

  if (!store.dailyNotes.gist) {
    const api = await getApi();
    const response = await api.create({
      description: DAILY_GIST_NAME,
      public: false,
      files: {
        [encodeDirectoryName(filename)]: {
          content: ZERO_WIDTH_SPACE
        }
      }
    });

    store.dailyNotes.gist = response.body;
  } else if (!store.dailyNotes.gist.files.hasOwnProperty(filename)) {
    let initialContent = "# {{date}}\n\n";
    if (store.dailyNotes.gist.files.hasOwnProperty(DAILY_TEMPLATE_FILENAME)) {
      initialContent = byteArrayToString(await workspace.fs.readFile(
        fileNameToUri(store.dailyNotes.gist.id, DAILY_TEMPLATE_FILENAME)
      ));
    }

    initialContent = initialContent.replace(
      "{{date}}",
      sharedMoment.format(config.get("dailyNotes.fileFormat"))
    );

    const writeFile = async () =>
      workspace.fs.writeFile(
        fileNameToUri(store.dailyNotes.gist!.id, filename),
        stringToByteArray(initialContent)
      );

    if (displayProgress) {
      await withProgress("Creating daily note...", writeFile);
    } else {
      await writeFile();
    }
  }

  const uri = fileNameToUri(store.dailyNotes.gist!.id, filename);
  window.showTextDocument(uri);
}

// This function is fairly duplicative of the above function, but I'm
// keeping it seperate for now to make it easier to understand.
export async function openDailyTemplate() {
  const defaultContent = "# {{date}}\n\n";
  if (!store.dailyNotes.gist) {
    const api = await getApi();
    const response = await api.create({
      description: DAILY_GIST_NAME,
      public: false,
      files: {
        [encodeDirectoryName(DAILY_TEMPLATE_FILENAME)]: {
          content: defaultContent
        }
      }
    });

    store.dailyNotes.gist = response.body;
  } else if (!store.dailyNotes.gist.files.hasOwnProperty(DAILY_TEMPLATE_FILENAME)) {
    await workspace.fs.writeFile(
      fileNameToUri(store.dailyNotes.gist.id, DAILY_TEMPLATE_FILENAME),
      stringToByteArray(defaultContent)
    );
  }

  const uri = fileNameToUri(store.dailyNotes.gist!.id, DAILY_TEMPLATE_FILENAME);
  window.showTextDocument(uri);
}

export async function clearDailyNotes() {
  const api = await getApi();
  await api.delete(store.dailyNotes.gist!.id);

  closeGistFiles(store.dailyNotes.gist!);
  store.dailyNotes.gist = null;
}

export async function refreshGists() {
  store.isLoading = true;

  const gists = updateGistTags(await listGists());
  store.dailyNotes.gist =
    gists.find((gist) => gist.description === DAILY_GIST_NAME) || null;

  // Filter out daily notes and split gists into archived and non-archived
  const nonDailyGists = gists.filter(
    (gist) => gist.description !== DAILY_GIST_NAME
  );

  // Split gists into archived and non-archived
  store.archivedGists = nonDailyGists.filter(isArchivedGist);
  store.gists = nonDailyGists.filter((gist) => !isArchivedGist(gist));

  store.isLoading = false;

  store.starredGists = updateGistTags(await starredGists());

  if (followedUsersStorage.followedUsers.length > 0) {
    store.followedUsers = followedUsersStorage.followedUsers.map(
      (username) => ({
        username,
        gists: [],
        isLoading: true
      })
    );

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
  followedUsersStorage.followedUsers =
    followedUsersStorage.followedUsers.filter((user) => user !== username);

  store.followedUsers = store.followedUsers.filter(
    (user) => user.username !== username
  );
}

export async function refreshGist(id: string) {
  const gist = await getGist(id);
  const oldGist = isArchivedGist(gist)
    ? store.archivedGists.find((g) => g.id === id)
    : store.gists.find((gist) => gist.id === id);
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

export async function archiveGist(id: string) {
  const gist = store.gists.find((g) => g.id === id);
  if (!gist) return;

  const updatedDescription = `${gist.description} [Archived]`;
  await changeDescription(id, updatedDescription);

  store.archivedGists.push(gist);
  store.gists = store.gists.filter((g) => g.id !== id);
}

export async function unarchiveGist(id: string) {
  const gist = store.archivedGists.find((g) => g.id === id);
  if (!gist) return;

  const updatedDescription = gist.description.replace(/ \[Archived\]$/, "");
  await changeDescription(id, updatedDescription);

  store.gists.push(gist);
  store.archivedGists = store.archivedGists.filter((g) => g.id !== id);
}
