import { debounce } from "debounce";
import * as path from "path";
import * as typescript from "typescript";
import * as vscode from "vscode";
import * as config from "../config";
import { EXTENSION_ID } from "../constants";
import { Gist } from "../store";
import { newGist } from "../store/actions";
import { closeGistFiles, fileNameToUri } from "../utils";
import { PlaygroundWebview } from "../webView";
import { addPlaygroundDependecyCommand } from "./playgroundDependencies";

const MARKUP_FILE = "index.html";
const PLAYGROUND_FILE = "playground.json";
const SCRIPT_FILE = "index.js";
const SCRIPT_FILE_TYPESCRIPT = "index.ts";
const STYLESHEET_FILE = "index.css";

const playgroundRegistry = new Map<string, vscode.WebviewPanel>();

export async function closeWebviewPanel(gistId: string) {
  if (playgroundRegistry.has(gistId)) {
    playgroundRegistry.get(gistId)!.dispose();
  }
}

async function generateNewPlaygroundFiles() {
  const scriptLanguage = await config.get("playground.scriptLanguage");
  const scriptFileName =
    scriptLanguage === "javascript" ? SCRIPT_FILE : SCRIPT_FILE_TYPESCRIPT;

  const files = [
    {
      filename: scriptFileName
    },
    {
      filename: PLAYGROUND_FILE
    }
  ];

  if (await config.get("playground.includeStylesheet")) {
    files.unshift({
      filename: STYLESHEET_FILE
    });
  }

  if (await config.get("playground.includeMarkup")) {
    files.unshift({
      filename: MARKUP_FILE
    });
  }

  return files;
}

function getScriptContent(document: vscode.TextDocument) {
  let content = document.getText();
  if (path.extname(document.uri.toString()).toLocaleLowerCase() === ".ts") {
    content = typescript.transpile(content);
  }
  return content;
}

function isPlaygroundScriptDocument(gist: Gist, document: vscode.TextDocument) {
  if (gist.id !== document.uri.authority) {
    return false;
  }

  const extension = path.extname(document.uri.toString()).toLocaleLowerCase();
  return extension === ".js" || extension === ".ts";
}

function isPlaygroundManifestFile(gist: Gist, document: vscode.TextDocument) {
  if (gist.id !== document.uri.authority) {
    return false;
  }

  const fileName = path.basename(document.uri.toString().toLowerCase());
  return fileName === "playground.json";
}

const EDITOR_LAYOUT = {
  oneByOne: {
    orientation: 0,
    groups: [{}, {}]
  },
  oneByTwo: {
    orientation: 0,
    groups: [
      { orientation: 1, groups: [{}, {}], size: 0.5 },
      { groups: [{}], size: 0.5 }
    ]
  },
  twoByTwo: {
    groups: [
      { groups: [{}, {}], size: 0.5 },
      { groups: [{}, {}], size: 0.5 }
    ]
  }
};

export async function openPlayground(gist: Gist) {
  const includesMarkup = Object.keys(gist.files).includes(MARKUP_FILE);
  const includesStylesheet = Object.keys(gist.files).includes(STYLESHEET_FILE);

  const scriptFile = Object.keys(gist.files).includes(SCRIPT_FILE_TYPESCRIPT)
    ? SCRIPT_FILE_TYPESCRIPT
    : SCRIPT_FILE;

  let editorLayout: any;
  if (includesMarkup && includesStylesheet) {
    editorLayout = EDITOR_LAYOUT.twoByTwo;
  } else if (includesMarkup || includesStylesheet) {
    editorLayout = EDITOR_LAYOUT.oneByTwo;
  } else {
    editorLayout = EDITOR_LAYOUT.oneByOne;
  }

  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  await vscode.commands.executeCommand("vscode.setEditorLayout", editorLayout);

  const availableViewColumns = [
    vscode.ViewColumn.One,
    vscode.ViewColumn.Two,
    vscode.ViewColumn.Three,
    vscode.ViewColumn.Four
  ];

  let htmlEditor: vscode.TextEditor;
  if (includesMarkup) {
    htmlEditor = await vscode.window.showTextDocument(
      fileNameToUri(gist.id, MARKUP_FILE),
      {
        preview: false,
        viewColumn: availableViewColumns.shift(),
        preserveFocus: true
      }
    );
  }

  const jsViewColumn = availableViewColumns.shift();
  const manifestEditor = await vscode.window.showTextDocument(
    fileNameToUri(gist.id, PLAYGROUND_FILE),
    {
      preview: false,
      viewColumn: jsViewColumn,
      preserveFocus: false
    }
  );

  const jsEditor = await vscode.window.showTextDocument(
    fileNameToUri(gist.id, scriptFile),
    {
      preview: false,
      viewColumn: jsViewColumn,
      preserveFocus: false
    }
  );

  let cssEditor: vscode.TextEditor;
  if (includesStylesheet) {
    cssEditor = await vscode.window.showTextDocument(
      fileNameToUri(gist.id, STYLESHEET_FILE),
      {
        preview: false,
        viewColumn: availableViewColumns.shift(),
        preserveFocus: true
      }
    );
  }

  const webViewPanel = vscode.window.createWebviewPanel(
    "gistpad.playgroundPreview",
    "Preview",
    { viewColumn: availableViewColumns.shift()!, preserveFocus: true },
    { enableScripts: true }
  );

  playgroundRegistry.set(gist.id, webViewPanel);

  const htmlView = new PlaygroundWebview(webViewPanel.webview);

  const documentChangeDisposeable = vscode.workspace.onDidChangeTextDocument(
    debounce(({ document }) => {
      if (includesMarkup && document.uri === htmlEditor.document.uri) {
        htmlView.updateHTML(document.getText());
      } else if (isPlaygroundScriptDocument(gist, document)) {
        htmlView.updateJavaScript(getScriptContent(document));
      } else if (isPlaygroundManifestFile(gist, document)) {
        htmlView.updateLibraryDependencies(document.getText());
      } else if (
        includesStylesheet &&
        document.uri === cssEditor!.document.uri
      ) {
        htmlView.updateCSS(document.getText());
      }
    }),
    500
  );

  webViewPanel.onDidDispose(() => {
    documentChangeDisposeable.dispose();
    playgroundRegistry.delete(gist.id);
    closeGistFiles(gist);
  });

  htmlView.updateLibraryDependencies(manifestEditor?.document.getText() || "");
  htmlView.updateHTML(includesMarkup ? htmlEditor!.document.getText() : "");
  htmlView.updateJavaScript(getScriptContent(jsEditor.document));
  htmlView.updateCSS(includesStylesheet ? cssEditor!.document.getText() : "");
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
          async () =>
            newGist(
              await generateNewPlaygroundFiles(),
              true,
              description,
              false
            )
        );

        openPlayground(gist);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_ID}.addPlaygroundDependency`,
      addPlaygroundDependecyCommand
    )
  );
}
