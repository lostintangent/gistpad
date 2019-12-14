import * as path from "path";
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
import { fileNameToUri, openGistFile } from "../utils";

export function registerFileCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.addActiveFile`,
      async (node: GistNode) => {
        await ensureAuthenticated();

        if (window.activeTextEditor) {
          let filename: string | undefined;
          if (window.activeTextEditor.document.isUntitled) {
            filename = await window.showInputBox({
              prompt: "Enter a name to give to this file",
              value: "foo.txt"
            });

            if (!filename) {
              return;
            }
          } else {
            filename = path.basename(
              window.activeTextEditor!.document.fileName
            );
          }

          window.withProgress(
            {
              location: ProgressLocation.Notification,
              title: "Adding files..."
            },
            () => {
              const content = window.activeTextEditor!.document.getText();
              return workspace.fs.writeFile(
                fileNameToUri(node.gist.id, filename!),
                Buffer.from(content!)
              );
            }
          );
        } else {
          window.showErrorMessage(
            "There's no active editor. Open a file and then retry again."
          );
        }
      }
    )
  );

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
      `${EXTENSION_ID}.copyFileContents`,
      async (node: GistFileNode) => {
        await ensureAuthenticated();

        const contents = await workspace.fs.readFile(
          fileNameToUri(node.gistId, node.file.filename!)
        );
        await env.clipboard.writeText(contents.toString());
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
      async (node: GistFileNode) => {
        await ensureAuthenticated();
        await workspace.fs.delete(
          fileNameToUri(node.gistId, node.file.filename!)
        );
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.openGistFile`,
      async (uri: Uri) => {
        openGistFile(uri);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.renameFile`,
      async (node: GistFileNode) => {
        await ensureAuthenticated();

        const newFilename = await window.showInputBox({
          prompt: "Specify the new name for this file",
          value: node.file.filename
        });

        if (!newFilename) {
          return;
        }

        await workspace.fs.rename(
          fileNameToUri(node.gistId, node.file.filename!),
          fileNameToUri(node.gistId, newFilename)
        );
      }
    )
  );
}
