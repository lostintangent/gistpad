import { URLSearchParams } from "url";
import * as vscode from "vscode";
import { CommandId } from "./constants";
import { log } from "./logger";
import { getToken, markUserAsSignedIn, testToken } from "./store/auth";

const getQuery = (uri: vscode.Uri): URLSearchParams => {
  const query = new URLSearchParams(uri.query);

  return query;
};

const openGist = async (uri: vscode.Uri) => {
  const query = getQuery(uri);

  const gistUrl = query.get("url");
  const gistId = query.get("id");
  const openAsWorkspace = query.get("workspace") === "true";

  if (!gistUrl && !gistId) {
    const message = `No gist URL nor Id specified in "${uri}"`;
    log.error(message);
    throw new Error(message);
  }

  const options = gistUrl ? { gistUrl } : { gistId };

  await vscode.commands.executeCommand(CommandId.openGist, {
    ...options,
    openAsWorkspace
  });
};

export class GistPadProtocolHandler implements vscode.UriHandler {
  public async handleUri(uri: vscode.Uri): Promise<void> {
    console.log("handling");
    switch (uri.path) {
      case "/open-gist": {
        return await openGist(uri);
      }
      case "/did-authenticate": {
        console.log("called!");
        const currentToken = await getToken();
        console.log(currentToken);
        if (currentToken && (await testToken(currentToken))) {
          await markUserAsSignedIn();
        } else {
          vscode.window.showErrorMessage("Failed to get a valid GitHub token");
        }
      }
      default: {
        break;
      }
    }
  }

  public dispose(): void {}
}

export const initializeProtocolHander = () => {
  if (typeof vscode.window.registerUriHandler === "function") {
    log.info("Protocol handler is registered.");
    vscode.window.registerUriHandler(new GistPadProtocolHandler());
  }
};
