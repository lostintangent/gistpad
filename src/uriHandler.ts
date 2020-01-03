import { URLSearchParams } from "url";
import * as vscode from "vscode";
import { followUser } from "./store/actions";
import { initializeAuth } from "./store/auth";
import { openGist } from "./utils";

async function handleFollowRequest(query: URLSearchParams) {
  const user = query.get("user");
  if (user) {
    followUser(user);
    vscode.commands.executeCommand("workbench.view.extension.gistpad");
  }
}

async function handleOpenRequest(query: URLSearchParams) {
  const gistId = query.get("gist");
  const openAsWorkspace = query.get("workspace") !== null;

  if (gistId) {
    openGist(gistId, !!openAsWorkspace);
  }
}

class GistPadPUriHandler implements vscode.UriHandler {
  public async handleUri(uri: vscode.Uri) {
    const query = new URLSearchParams(uri.query);

    switch (uri.path) {
      case "/open":
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
