import * as fs from "fs";
import * as path from "path";
import { URL } from "url";
import { commands, ExtensionContext, window, workspace } from "vscode";
import {
  DIRECTORY_SEPERATOR,
  ENCODED_DIRECTORY_SEPERATOR,
  EXTENSION_NAME
} from "../constants";
import { ensureAuthenticated } from "../store/auth";
import { GistDirectoryNode } from "../tree/nodes";
import {
  decodeDirectoryUri,
  fileNameToUri,
  stringToByteArray,
  withProgress
} from "../utils";

function getDirectoryFiles(nodes: GistDirectoryNode[]) {
  return nodes.flatMap((node) =>
    Object.keys(node.gist.files)
      .filter((file) =>
        file.startsWith(`${node.directory}${ENCODED_DIRECTORY_SEPERATOR}`)
      )
      .map((file) => decodeDirectoryUri(fileNameToUri(node.gist.id, file)))
  );
}

export function registerDirectoryCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.addDirectoryFile`,
      async (node: GistDirectoryNode) => {
        await ensureAuthenticated();

        const fileName = await window.showInputBox({
          prompt:
            "Enter the files name(s) to add to the directory (can be a comma-separated list)",
          placeHolder: "foo.md"
        });

        if (fileName) {
          await withProgress("Adding file(s)...", () => {
            const fileNames = fileName.split(",");
            return Promise.all(
              fileNames.map((fileName) => {
                return workspace.fs.writeFile(
                  fileNameToUri(
                    node.gist.id,
                    `${node.directory}${DIRECTORY_SEPERATOR}${fileName}`
                  ),
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
      `${EXTENSION_NAME}.uploadFileToDirectory`,
      async (node: GistDirectoryNode) => {
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

                const gistFileName = `${node.directory}${DIRECTORY_SEPERATOR}${fileName}`;
                return workspace.fs.writeFile(
                  fileNameToUri(node.gist.id, gistFileName),
                  content
                );
              })
            )
          );
        }
      }
    )
  );

  const DELETE_RESPONSE = "Delete";
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.deleteDirectory`,
      async (
        targetNode: GistDirectoryNode,
        multiSelectNodes?: GistDirectoryNode[]
      ) => {
        await ensureAuthenticated();

        const uris = getDirectoryFiles(multiSelectNodes || [targetNode]);

        const [promptSuffix, progressSuffix] = multiSelectNodes
          ? ["selected directories", "directories"]
          : [`"${targetNode.label}" directory`, "directory"];

        const response = await window.showInformationMessage(
          `Are you sure you want to delete the ${promptSuffix}?`,
          DELETE_RESPONSE
        );

        if (response !== DELETE_RESPONSE) {
          return;
        }

        await withProgress(`Deleting ${progressSuffix}...`, () => {
          return Promise.all(
            uris.map((uri) => {
              workspace.fs.delete(uri);
            })
          );
        });
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.duplicateDirectory`,
      async (node: GistDirectoryNode) => {
        await ensureAuthenticated();

        const directory = await window.showInputBox({
          placeHolder: "Specify the name of the new duplicated directory",
          value: `${node.directory} - Copy`
        });

        if (!directory) {
          return;
        }

        const uris = getDirectoryFiles([node]);

        await withProgress(`Duplicating directory...`, () =>
          Promise.all(
            uris.map(async (uri) => {
              const contents = await workspace.fs.readFile(uri);
              const duplicateFileName = `${directory}${DIRECTORY_SEPERATOR}${path.basename(
                uri.path
              )}`;

              return workspace.fs.writeFile(
                fileNameToUri(node.gist.id, duplicateFileName),
                contents
              );
            })
          )
        );
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.renameDirectory`,
      async (node: GistDirectoryNode) => {
        await ensureAuthenticated();

        const newDirectoryName = await window.showInputBox({
          prompt: "Specify the new name for this directory",
          value: node.directory
        });

        if (newDirectoryName) {
          const uris = getDirectoryFiles([node]);

          // TODO: Enable renames to be buffered appropriately,
          // so that we don't have to run them sequentially like this
          await withProgress(`Renaming directory...`, async () => {
            for (const uri of uris) {
              const fileName = path.basename(uri.path);
              const newFileName = `${newDirectoryName}${DIRECTORY_SEPERATOR}${fileName}`;
              const newUri = fileNameToUri(node.gist.id, newFileName);

              await workspace.fs.rename(uri, newUri);
            }
          });
        }
      }
    )
  );
}
