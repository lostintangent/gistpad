import * as path from "path";
import {
  commands,
  env,
  ExtensionContext,
  Uri,
  window,
  workspace
} from "vscode";
import { EXTENSION_NAME } from "../constants";
import { findGistInStore } from "../store";
import { refreshGist } from "../store/actions";
import { ensureAuthenticated } from "../store/auth";
import { GistFileNode, GistNode } from "../tree/nodes";
import { createGistPadOpenUrl, createGistPadWebUrl } from "../uriHandler";
import {
  byteArrayToString,
  decodeDirectoryName,
  encodeDirectoryUri,
  fileNameToUri,
  getGistDetailsFromUri,
  getUrlFileNameHash,
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
            "Enter the files name(s) to add to the gist (can be a comma-separated list)",
          placeHolder: "foo.md"
        });

        if (fileName) {
          await withProgress("Adding file(s)...", async () => {
            const fileUris = fileName
              .split(",")
              .map((fileName) => fileNameToUri(node.gist.id, fileName));
            const emptyBuffer = stringToByteArray("");

            await Promise.all(
              fileUris.map((uri) => workspace.fs.writeFile(uri, emptyBuffer))
            );

            fileUris.reverse().forEach((uri) => openGistFile(uri));
          });
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
      `${EXTENSION_NAME}.copyGistPadFileUrl`,
      async (nodeOrUri: GistFileNode | Uri) => {
        let details: { gistId: string; file: string } | undefined;
        if (nodeOrUri instanceof GistFileNode) {
          details = {
            gistId: nodeOrUri.gistId,
            file: nodeOrUri.file.filename!
          };
        } else {
          const { gistId, file } = getGistDetailsFromUri(
            encodeDirectoryUri(nodeOrUri)
          );
          details = { gistId, file };
        }
        const url = details.file.endsWith(".md")
          ? createGistPadWebUrl(details.gistId, details.file)
          : createGistPadOpenUrl(details.gistId, details.file);
        await env.clipboard.writeText(url);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.copyFileUrl`,
      async (nodeOrUri: GistFileNode | Uri) => {
        let url: string;
        if (nodeOrUri instanceof GistFileNode) {
          const gist = findGistInStore(nodeOrUri.gistId)!;
          url = `${gist.html_url}${getUrlFileNameHash(
            nodeOrUri.file.filename!
          )}`;
        } else {
          const { gistId, file } = getGistDetailsFromUri(
            encodeDirectoryUri(nodeOrUri)
          );

          const gist = findGistInStore(gistId)!;
          url = `${gist.html_url}${getUrlFileNameHash(file)}`;
        }

        await env.clipboard.writeText(url);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.copyFileLatestUrl`,
      async (nodeOrUri: GistFileNode | Uri) => {
        let url: string;
        if (nodeOrUri instanceof GistFileNode) {
          const gist = findGistInStore(nodeOrUri.gistId)!;
          url = `https://gist.githubusercontent.com/${gist.owner!.login}/${gist.id}/raw/${encodeURIComponent(nodeOrUri.file.filename!)}`;
        } else {
          const { gistId, file } = getGistDetailsFromUri(
            encodeDirectoryUri(nodeOrUri)
          );

          const gist = findGistInStore(gistId)!;
          url = `https://gist.githubusercontent.com/${gist.owner!.login}/${gistId}/raw/${encodeURIComponent(file)}`;
        }

        await env.clipboard.writeText(url);
      }
    )
  );

  const DELETE_RESPONSE = "Delete";
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.deleteFile`,
      async (
        targetNode: GistFileNode | Uri,
        multiSelectNodes?: GistFileNode[]
      ) => {
        await ensureAuthenticated();

        let uris: Uri[];
        let fileLabel: string;

        if (targetNode instanceof GistFileNode) {
          uris = (multiSelectNodes || [targetNode]).map((node) =>
            fileNameToUri(node.gistId, node.file.filename!)
          );

          fileLabel = targetNode.label?.toString()!;
        } else {
          uris = [targetNode];
          fileLabel = path.basename(targetNode.toString());
        }

        const suffix =
          multiSelectNodes && !("editorIndex" in multiSelectNodes) // TODO: Remove this hack
            ? "selected files"
            : `"${fileLabel}" file`;

        const response = await window.showInformationMessage(
          `Are you sure you want to delete the ${suffix}?`,
          DELETE_RESPONSE
        );
        if (response !== DELETE_RESPONSE) {
          return;
        }

        await withProgress("Deleting file(s)...", () => {
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
      `${EXTENSION_NAME}.duplicateFile`,
      async (node: GistFileNode) => {
        const extension = path.extname(node.file.filename!);
        const rootFileName = node.file.filename?.replace(extension, "");
        const duplicateFileName = `${rootFileName} - Copy${extension}`;

        const file = await window.showInputBox({
          placeHolder: "Specify the name of the new duplicated file",
          value: decodeDirectoryName(duplicateFileName)
        });

        if (!file) {
          return;
        }

        withProgress("Duplicating file...", async () => {
          const contents = await workspace.fs.readFile(
            fileNameToUri(node.gistId, node.file.filename!)
          );

          return workspace.fs.writeFile(
            fileNameToUri(node.gistId, file),
            contents
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

        let gistId: string, fileName: string;
        if (nodeOrUri instanceof GistFileNode) {
          gistId = nodeOrUri.gistId;
          fileName = decodeDirectoryName(nodeOrUri.file.filename!);
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
          withProgress("Renaming file...", async () =>
            workspace.fs.rename(
              fileNameToUri(gistId, fileName),
              fileNameToUri(gistId, newFilename)
            )
          );
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
          withProgress("Uploading file(s)...", async () => {
            await Promise.all(
              files.map(async (file) => {
                const fileName = path.basename(file.path);
                const content = await workspace.fs.readFile(file);

                return workspace.fs.writeFile(
                  fileNameToUri(node.gist.id, fileName),
                  content
                );
              })
            );

            refreshGist(node.gist.id);
          });
        }
      }
    )
  );
}
