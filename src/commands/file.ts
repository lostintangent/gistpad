import * as fs from "fs";
import * as path from "path";
import { URL } from "url";
import {
  commands,
  env,
  ExtensionContext,
  Uri,
  window,
  workspace
} from "vscode";
import { EXTENSION_NAME } from "../constants";
import { ensureAuthenticated } from "../store/auth";
import { GistFileNode, GistNode } from "../tree/nodes";
import {
  byteArrayToString,
  fileNameToUri,
  getGistDetailsFromUri,
  openGistFile,
  stringToByteArray,
  withProgress
} from "../utils";

export function registerFileCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.addFile`,
      async (node: GistNode) => {
        await ensureAuthenticated();

        const fileName = await window.showInputBox({
          prompt:
            "Enter the files name(s) to add to the gist (can be a comma-seperated list)",
          placeHolder: "foo.md"
        });

        if (fileName) {
          await withProgress("Adding file(s)...", () => {
            const fileNames = fileName.split(",");
            return Promise.all(
              fileNames.map((fileName) => {
                return workspace.fs.writeFile(
                  fileNameToUri(node.gist.id, fileName),
                  stringToByteArray("")
                );
              })
            );
          });
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.uploadFileToGist`,
      async (node: GistNode) => {
        await ensureAuthenticated();

        const files = await window.showOpenDialog({
          canSelectMany: true,
          openLabel: "Upload"
        });

        if (files) {
          withProgress("Uploading file(s)...", () =>
            Promise.all(
              files.map((file) => {
                const fileName = path.basename(file.path);
                const content = fs.readFileSync(new URL(file.toString()));

                return workspace.fs.writeFile(
                  fileNameToUri(node.gist.id, fileName),
                  content
                );
              })
            )
          );
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.copyFileContents`,
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
      `${EXTENSION_NAME}.copyFileUrl`,
      async (node: GistFileNode) => {
        await env.clipboard.writeText(node.file.raw_url!);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.deleteFile`,
      async (targetNode: GistFileNode, multiSelectNodes?: GistFileNode[]) => {
        await ensureAuthenticated();

        await withProgress("Deleting file(s)...", () => {
          const fileNodes = multiSelectNodes || [targetNode];
          return Promise.all(
            fileNodes.map((fileNode) => {
              workspace.fs.delete(
                fileNameToUri(fileNode.gistId, fileNode.file.filename!)
              );
            })
          );
        });
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.openGistFile`, (uri: Uri) =>
      openGistFile(uri, false)
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.renameFile`,
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

        if (newFilename) {
          await workspace.fs.rename(
            fileNameToUri(gistId, fileName),
            fileNameToUri(gistId, newFilename)
          );
        }
      }
    )
  );
}
