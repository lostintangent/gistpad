import { when } from "mobx";
import { URLSearchParams } from "url";
import * as vscode from "vscode";
import { EXTENSION_ID, EXTENSION_NAME } from "./constants";
import { store as repoStore } from "./repos/store";
import { openRepo } from "./repos/store/actions";
import { store } from "./store";
import { followUser, openTodayNote } from "./store/actions";
import { ensureAuthenticated as ensureAuthenticatedInternal } from "./store/auth";
import { decodeDirectoryName, fileNameToUri, openGist, openGistFile, withProgress } from "./utils";

const OPEN_PATH = "/open";
const GIST_PARAM = "gist";
const REPO_PARAM = "repo";
const FILE_PARAM = "file";

async function ensureAuthenticated() {
  await when(() => store.isSignedIn, { timeout: 3000 });
  await ensureAuthenticatedInternal();

  if (!store.isSignedIn) throw new Error();
}

async function handleFollowRequest(query: URLSearchParams) {
  await ensureAuthenticated();

  const user = query.get("user");
  if (user) {
    followUser(user);
    vscode.commands.executeCommand("workbench.view.extension.gistpad");
  }
}

async function handleOpenRequest(query: URLSearchParams) {
  const gistId = query.get(GIST_PARAM);
  const repoName = query.get(REPO_PARAM);
  const file = query.get(FILE_PARAM);
  const openAsWorkspace = query.get("workspace") !== null;

  if (gistId) {
    if (file) {
      const uri = fileNameToUri(gistId, decodeDirectoryName(file));
      openGistFile(uri)
    } else {
      openGist(gistId, !!openAsWorkspace);
    }
  } else if (repoName) {
    openRepo(repoName, true);
  }
}

async function handleDailyRequest() {
  withProgress("Opening daily note...", async () => {
    await ensureAuthenticated();

    // We need to wait for the gists to fully load
    // so that we know whether there's already a
    // daily gist or not, before opening it.
    await when(() => !store.isLoading);
    await vscode.commands.executeCommand("gistpad.gists.focus");
    await openTodayNote(false);
  });
}

async function handleTodayRequest() {
  withProgress("Opening today page...", async () => {
    await ensureAuthenticated();

    await when(
      () => repoStore.wiki !== undefined && !repoStore.wiki.isLoading,
      { timeout: 15000 }
    );

    if (repoStore.wiki) {
      await vscode.commands.executeCommand("gistpad.repos.focus");
      await vscode.commands.executeCommand(
        `${EXTENSION_NAME}.openTodayPage`,
        null,
        false
      );
    } else {
      if (
        await vscode.window.showErrorMessage(
          "You don't currently have a wiki repo. Create or open one, then try again.",
          "Open repo"
        )
      ) {
        vscode.commands.executeCommand(`${EXTENSION_NAME}.openRepository`);
      }
    }
  });
}

export function createGistPadOpenUrl(gistId: string, file?: string) {
  const fileParam = file ? `&${FILE_PARAM}=${file}` : "";
  return `vscode://${EXTENSION_ID}${OPEN_PATH}?${GIST_PARAM}=${gistId}${fileParam}`;
}

export function createGistPadWebUrl(gistId: string, file: string = "README.md") {
  const path = file && file !== "README.md" ? `/${file}` : "";
  return `https://gistpad.dev/#share/${gistId}${path}`;
}

class GistPadPUriHandler implements vscode.UriHandler {
  public async handleUri(uri: vscode.Uri) {
    const query = new URLSearchParams(uri.query);
    switch (uri.path) {
      case OPEN_PATH:
        return await handleOpenRequest(query);
      case "/follow":
        return await handleFollowRequest(query);
      case "/daily":
        return await handleDailyRequest();
      case "/today":
        return await handleTodayRequest();
    }
  }
}

export function registerProtocolHandler() {
  if (typeof vscode.window.registerUriHandler === "function") {
    vscode.window.registerUriHandler(new GistPadPUriHandler());
  }
}
