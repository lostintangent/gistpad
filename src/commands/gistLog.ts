import * as vscode from "vscode";
import { EXTENSION_ID } from "../constants";
import { Gist } from "../store";
import { newGist } from "../store/actions";
import { GistNode, GistsNode } from "../tree/nodes";
import { fileNameToUri } from "../utils";

const GISTLOG_URL = "https://gistlog.co";
const GISTLOG_BLOG_FILE = "blog.md";
const GISTLOG_CONFIG_FILE = "gistlog.yml";

const createGistLogFeedUri = (login: string) => {
  return vscode.Uri.parse(`${GISTLOG_URL}/${login}`);
};

const createGistLogUri = (gist: Gist) => {
  return vscode.Uri.parse(`${GISTLOG_URL}/${gist.owner.login}/${gist.id}`);
};

const newGistLog = async (description: string) => {
  const files = [
    {
      filename: GISTLOG_BLOG_FILE
    },
    {
      filename: GISTLOG_CONFIG_FILE,
      content: "published: false"
    }
  ];

  const gist = await newGist(files, true, description, false);
  const blogFileUri = fileNameToUri(gist.id, GISTLOG_BLOG_FILE);
  // openGistFile(blogFileUri, false);
  console.log(blogFileUri);
};

export async function registerGistLogCommands(
  context: vscode.ExtensionContext
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(`${EXTENSION_ID}.newGistLog`, async () => {
      const description = await vscode.window.showInputBox({
        prompt: "Enter the description of the GistLog"
      });

      if (!description) {
        return;
      }

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Creating GistLog..."
        },
        () => newGistLog(description)
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_ID}.openGistInGistLog`,
      async (node: GistNode) => {
        const uri = createGistLogUri(node.gist);
        vscode.env.openExternal(uri);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_ID}.openGistLogFeed`,
      async (node: GistsNode) => {
        const uri = createGistLogFeedUri(node.login);
        vscode.env.openExternal(uri);
      }
    )
  );
}
