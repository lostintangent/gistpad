import * as fs from "fs";
import * as path from "path";
import { URL } from "url";
import {
  commands,
  env,
  ExtensionContext,
  ProgressLocation,
  Uri,
  window,
  workspace
} from "vscode";
import { EXTENSION_ID } from "../constants";
import { addGistFiles } from "../store/actions";
import { ensureAuthenticated } from "../store/auth";
import { GistFileNode, GistNode } from "../tree/nodes";
import {
  byteArrayToString,
  fileNameToUri,
  getGistDetailsFromUri,
  openGistFile
} from "../utils";

export function registerFileCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.addFile`,
      async (node: GistNode) => {
        await ensureAuthenticated();

        const fileName = await window.showInputBox({
          prompt:
            "Enter the files name(s) to seed the Gist with (can be a comma-seperated list)",
          value: "foo.txt"
        });
        if (!fileName) {
          return;
        }

        window.withProgress(
          { location: ProgressLocation.Notification, title: "Adding files..." },
          () => {
            const fileNames = fileName.split(",");
            return addGistFiles(node.gist.id, fileNames);
          }
        );
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.uploadFileToGist`,
      async (node: GistNode) => {
        await ensureAuthenticated();

        const files = await window.showOpenDialog({
          canSelectMany: true,
          openLabel: "Upload"
        });

        if (files) {
          window.withProgress(
            {
              location: ProgressLocation.Notification,
              title: "Uploading files..."
            },
            async () => {
              for (const file of files) {
                const fileName = path.basename(file.path);
                const content = fs.readFileSync(new URL(file.toString()));

                await workspace.fs.writeFile(
                  fileNameToUri(node.gist.id, fileName),
                  content
                );
              }
            }
          );
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.copyFileContents`,
      async (node: GistFileNode) => {
        const contents = await workspace.fs.readFile(
          fileNameToUri(node.gistId, node.file.filename!)
        );
        await env.clipboard.writeText(byteArrayToString(contents));
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.copyFileUrl`,
      async (node: GistFileNode) => {
        await env.clipboard.writeText(node.file.raw_url!);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.deleteFile`,
      async (targetNode: GistFileNode, multiSelectNodes?: GistFileNode[]) => {
        await ensureAuthenticated();

        window.withProgress(
          {
            title: "Deleting file(s)...",
            location: ProgressLocation.Notification
          },
          async () => {
            const fileNodes = multiSelectNodes || [targetNode];
            for (const fileNode of fileNodes) {
              await workspace.fs.delete(
                fileNameToUri(fileNode.gistId, fileNode.file.filename!)
              );
            }
          }
        );
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.openGistFile`,
      async (uri: Uri) => {
        openGistFile(uri, false);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.renameFile`,
      async (nodeOrUri: GistFileNode | Uri) => {
        await ensureAuthenticated();

        let gistId, fileName;
        if (nodeOrUri instanceof GistFileNode) {
          gistId = nodeOrUri.gistId;
          fileName = nodeOrUri.file.filename!;
        } else {
          const details = getGistDetailsFromUri(nodeOrUri);
          gistId = details.gistId;
          fileName = details.file;
        }

        const newFilename = await window.showInputBox({
          prompt: "Specify the new name for this file",
          value: fileName
        });

        if (!newFilename) {
          return;
        }

        await workspace.fs.rename(
          fileNameToUri(gistId, fileName),
          fileNameToUri(gistId, newFilename)
        );
      }
    )
  );
}
