import { debounce } from "debounce";
import * as vscode from "vscode";
import { EXTENSION_ID } from "../constants";
import { Gist } from "../store";
import { newGist } from "../store/actions";
import { closeGistFiles, fileNameToUri } from "../utils";
import { PlaygroundWebview } from "../webView";

const playgroundFiles = [
  {
    filename: "index.html"
  },
  {
    filename: "index.js"
  },
  {
    filename: "index.css"
  },
  {
    filename: "playground.json"
  }
];

const playgroundRegistry = new Map<string, vscode.WebviewPanel>();

export async function closeWebviewPanel(gistId: string) {
  if (playgroundRegistry.has(gistId)) {
    playgroundRegistry.get(gistId)!.dispose();
  }
}

export async function openPlayground(gist: Gist) {
  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  await vscode.commands.executeCommand("vscode.setEditorLayout", {
    groups: [
      { groups: [{}, {}], size: 0.5 },
      { groups: [{}, {}], size: 0.5 }
    ]
  });

  const htmlDocument = await vscode.workspace.openTextDocument(
    fileNameToUri(gist.id, "index.html")
  );
  await vscode.window.showTextDocument(htmlDocument, {
    preview: false,
    viewColumn: vscode.ViewColumn.One,
    preserveFocus: true
  });

  const jsDocument = await vscode.workspace.openTextDocument(
    fileNameToUri(gist.id, "index.js")
  );
  await vscode.window.showTextDocument(jsDocument, {
    preview: false,
    viewColumn: vscode.ViewColumn.Two,
    preserveFocus: false
  });

  const cssDocument = await vscode.workspace.openTextDocument(
    fileNameToUri(gist.id, "index.css")
  );
  await vscode.window.showTextDocument(cssDocument, {
    preview: false,
    viewColumn: vscode.ViewColumn.Three,
    preserveFocus: true
  });

  const webViewPanel = vscode.window.createWebviewPanel(
    "gistpad.playgroundPreview",
    "Preview",
    { viewColumn: vscode.ViewColumn.Four, preserveFocus: true },
    { enableScripts: true }
  );

  webViewPanel.onDidDispose(() => {
    playgroundRegistry.delete(gist.id);
    closeGistFiles(gist);
  });

  playgroundRegistry.set(gist.id, webViewPanel);

  const htmlView = new PlaygroundWebview(webViewPanel.webview);

  vscode.workspace.onDidChangeTextDocument(
    debounce((e) => {
      const newContent = e.document.getText();
      if (e.document === htmlDocument) {
        htmlView.updateHTML(newContent);
      } else if (e.document === jsDocument) {
        htmlView.updateJavaScript(newContent);
      } else {
        htmlView.updateCSS(newContent);
      }
    }),
    500
  );

  vscode.workspace.onDidCloseTextDocument((e) => {
    if (e === htmlDocument || e === jsDocument || e === cssDocument) {
      closeGistFiles(gist);
    }
  });

  htmlView.updateHTML(htmlDocument.getText());
  htmlView.updateJavaScript(jsDocument.getText());
  htmlView.updateCSS(cssDocument.getText());
}

export async function registerPlaygroundCommands(
  context: vscode.ExtensionContext
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_ID}.newPlayground`,
      async () => {
        const description = await vscode.window.showInputBox({
          prompt: "Enter the description of the playground"
        });

        if (!description) {
          return;
        }

        const gist: Gist = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Creating Playground..."
          },
          () => newGist(playgroundFiles, true, description, false)
        );

        openPlayground(gist);
      }
    )
  );
}
