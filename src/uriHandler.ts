import { URLSearchParams } from "url";
import * as vscode from "vscode";
import { EXTENSION_ID } from "./constants";
import { manageRepo } from "./repos/store/actions";
import { followUser } from "./store/actions";
import { initializeAuth } from "./store/auth";
import { openGist } from "./utils";

const OPEN_PATH = "/open";
const GIST_PARAM = "gist";
const REPO_PARAM = "repo";

async function handleFollowRequest(query: URLSearchParams) {
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
    manageRepo(repoName);
  }
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
      case "/did-authenticate":
        return await initializeAuth();
    }
  }
}

export function registerProtocolHander() {
  if (typeof vscode.window.registerUriHandler === "function") {
    vscode.window.registerUriHandler(new GistPadPUriHandler());
  }
}
