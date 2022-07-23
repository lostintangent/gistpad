import { when } from "mobx";
import { URLSearchParams } from "url";
import * as vscode from "vscode";
import { EXTENSION_ID, EXTENSION_NAME } from "./constants";
import { store as repoStore } from "./repos/store";
import { openRepo } from "./repos/store/actions";
import { store } from "./store";
import { followUser, newScratchNote } from "./store/actions";
import { ensureAuthenticated as ensureAuthenticatedInternal } from "./store/auth";
import { openGist, withProgress } from "./utils";

const OPEN_PATH = "/open";
const GIST_PARAM = "gist";
const REPO_PARAM = "repo";

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
  const openAsWorkspace = query.get("workspace") !== null;

  if (gistId) {
    openGist(gistId, !!openAsWorkspace);
  } else if (repoName) {
    openRepo(repoName, true);
  }
}

async function handleScratchRequest() {
  withProgress("Opening scratch note...", async () => {
    await ensureAuthenticated();

    // We need to wait for the gists to fully load
    // so that we know whether there's already a
    // scratch gist or not, before opening it.
    await when(() => !store.isLoading);
    await vscode.commands.executeCommand("gistpad.gists.focus");
    await newScratchNote(false);
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

export function createGistPadOpenUrl(gistId: string) {
  return `vscode://${EXTENSION_ID}${OPEN_PATH}?${GIST_PARAM}=${gistId}`;
}

class GistPadPUriHandler implements vscode.UriHandler {
  public async handleUri(uri: vscode.Uri) {
    const query = new URLSearchParams(uri.query);
    switch (uri.path) {
      case OPEN_PATH:
        return await handleOpenRequest(query);
      case "/follow":
        return await handleFollowRequest(query);
      case "/scratch":
        return await handleScratchRequest();
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
