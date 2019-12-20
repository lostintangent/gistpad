import { debounce } from "debounce";
import * as path from "path";
import * as typescript from "typescript";
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

function isPlaygroundScriptDocument(gist: Gist, document: vscode.TextDocument) {
  if (gist.id !== document.uri.authority) {
    return false;
  }

  const extension = path.extname(document.uri.toString()).toLocaleLowerCase();
  return extension === ".js" || extension === ".ts";
}

function getScriptContent(document: vscode.TextDocument) {
  let content = document.getText();
  if (path.extname(document.uri.toString()).toLocaleLowerCase() === ".ts") {
    content = typescript.transpile(content);
  }
  return content;
}

export async function openPlayground(gist: Gist) {
  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  await vscode.commands.executeCommand("vscode.setEditorLayout", {
    groups: [
      { groups: [{}, {}], size: 0.5 },
      { groups: [{}, {}], size: 0.5 }
    ]
  });

  const htmlEditor = await vscode.window.showTextDocument(
    fileNameToUri(gist.id, "index.html"),
    {
      preview: false,
      viewColumn: vscode.ViewColumn.One,
      preserveFocus: true
    }
  );

  const scriptFile = Object.keys(gist.files).includes("index.ts")
    ? "index.ts"
    : "index.js";

  const jsEditor = await vscode.window.showTextDocument(
    fileNameToUri(gist.id, scriptFile),
    {
      preview: false,
      viewColumn: vscode.ViewColumn.Two,
      preserveFocus: false
    }
  );

  const cssEditor = await vscode.window.showTextDocument(
    fileNameToUri(gist.id, "index.css"),
    {
      preview: false,
      viewColumn: vscode.ViewColumn.Three,
      preserveFocus: true
    }
  );

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
    debounce(({ document }) => {
      if (document.uri === htmlEditor.document.uri) {
        htmlView.updateHTML(document.getText());
      } else if (isPlaygroundScriptDocument(gist, document)) {
        htmlView.updateJavaScript(getScriptContent(document));
      } else if (document.uri === cssEditor.document.uri) {
        htmlView.updateCSS(document.getText());
      }
    }),
    500
  );

  htmlView.updateHTML(htmlEditor.document.getText());
  htmlView.updateJavaScript(getScriptContent(jsEditor.document));
  htmlView.updateCSS(cssEditor.document.getText());
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
