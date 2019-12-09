import { URLSearchParams } from "url";
import * as vscode from "vscode";
import { CommandId } from "./constants";
import { log } from "./logger";

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
    openAsWorkspace,
  });
};

export class GistPadProtocolHandler implements vscode.UriHandler {
  public async handleUri(uri: vscode.Uri): Promise<void> {
    switch (uri.path) {
      case "/open-gist": {
        return await openGist(uri);
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
