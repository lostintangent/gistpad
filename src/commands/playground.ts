import { debounce } from "debounce";
import * as path from "path";
import { IPlaygroundJSON } from "src/interfaces/IPlaygroundJSON";
import * as typescript from "typescript";
import * as vscode from "vscode";
import * as config from "../config";
import { EXTENSION_ID, PLAYGROUND_JSON_FILE } from "../constants";
import { Gist } from "../store";
import { newGist } from "../store/actions";
import { closeGistFiles, fileNameToUri } from "../utils";
import { PlaygroundWebview } from "../webView";
import { addPlaygroundLibraryCommand } from "./addPlaygroundLibraryCommand";
import { getCDNJSLibraries } from "./cdnjs";

const MARKUP_FILE = "index.html";
const STYLESHEET_FILE = "index.css";

const ScriptLanguage = {
  javascript: ".js",
  javascriptreact: ".jsx",
  typescript: ".ts",
  typescriptreact: ".tsx"
};

const REACT_EXTENSIONS = [
  ScriptLanguage.javascriptreact,
  ScriptLanguage.typescriptreact
];

const TYPESCRIPT_EXTENSIONS = [ScriptLanguage.typescript, ...REACT_EXTENSIONS];
const SCRIPT_EXTENSIONS = [ScriptLanguage.javascript, ...TYPESCRIPT_EXTENSIONS];

const playgroundRegistry = new Map<string, vscode.WebviewPanel>();

export async function closeWebviewPanel(gistId: string) {
  if (playgroundRegistry.has(gistId)) {
    playgroundRegistry.get(gistId)!.dispose();
  }
}

const isReactFile = (fileName: string) => {
  return REACT_EXTENSIONS.includes(path.extname(fileName));
};

const REACT_LIBRARIES = ["react", "react-dom"];

const includesReactFiles = (gist: Gist) => {
  return Object.keys(gist.files).some(isReactFile);
};

const includesReactLibraries = (libraries: string[]) => {
  return REACT_LIBRARIES.every((library) => libraries.includes(library));
};

const getManifestContent = (gist: Gist) => {
  const manifest = gist.files[PLAYGROUND_JSON_FILE].content!;

  if (includesReactFiles(gist)) {
    const parsedManifest = JSON.parse(manifest);

    if (!includesReactLibraries(parsedManifest.libraries)) {
      parsedManifest.libraries.push(REACT_LIBRARIES);
      parsedManifest.libraries = [...new Set(parsedManifest.libraries)];

      const content = JSON.stringify(parsedManifest, null, 2);

      vscode.workspace.fs.writeFile(
        fileNameToUri(gist.id, PLAYGROUND_JSON_FILE),
        Buffer.from(content)
      );

      return content;
    }
  }

  return manifest;
};

async function generateNewPlaygroundFiles() {
  const scriptLanguage = await config.get("playground.scriptLanguage");
  const scriptFileName = `index${ScriptLanguage[scriptLanguage]}`;

  const manifest = {
    libraries: <string[]>[]
  };

  if (isReactFile(scriptFileName)) {
    manifest.libraries.push(...REACT_LIBRARIES);
  }

  const files = [
    {
      filename: scriptFileName
    },
    {
      filename: PLAYGROUND_JSON_FILE,
      content: JSON.stringify(manifest, null, 2)
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

export function getScriptContent(
  document: vscode.TextDocument,
  manifest: IPlaygroundJSON | undefined
) {
  let content = document.getText();
  const extension = path.extname(document.uri.toString()).toLocaleLowerCase();

  const includesJsx = manifest && manifest.libraries.includes("react");
  if (TYPESCRIPT_EXTENSIONS.includes(extension) || includesJsx) {
    content = typescript.transpile(content, {
      experimentalDecorators: true,
      jsx: includesJsx ? typescript.JsxEmit.React : void 0
    });
  }
  return content;
}

function isPlaygroundScriptDocument(gist: Gist, document: vscode.TextDocument) {
  if (gist.id !== document.uri.authority) {
    return false;
  }

  const extension = path.extname(document.uri.toString()).toLocaleLowerCase();
  return SCRIPT_EXTENSIONS.includes(extension);
}

function isPlaygroundManifestFile(gist: Gist, document: vscode.TextDocument) {
  if (gist.id !== document.uri.authority) {
    return false;
  }

  const fileName = path.basename(document.uri.toString().toLowerCase());
  return fileName === PLAYGROUND_JSON_FILE;
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

  const scriptFile = Object.keys(gist.files).find((file) =>
    SCRIPT_EXTENSIONS.includes(path.extname(file))
  );

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

  const jsEditor = await vscode.window.showTextDocument(
    fileNameToUri(gist.id, scriptFile!),
    {
      preview: false,
      viewColumn: availableViewColumns.shift(),
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

  const output = vscode.window.createOutputChannel("GistPad Playground");
  const htmlView = new PlaygroundWebview(webViewPanel.webview, output);
  output.show(false);

  const documentChangeDisposeable = vscode.workspace.onDidChangeTextDocument(
    debounce(({ document }) => {
      if (includesMarkup && document.uri === htmlEditor.document.uri) {
        htmlView.updateHTML(document.getText());
      } else if (isPlaygroundScriptDocument(gist, document)) {
        // If the user renamed the script file (e.g. from *.js to *.jsx)
        // than we need to update the manifest in case new libraries
        // need to be injected into the wevview (e.g. "react").
        if (jsEditor.document.uri.toString() !== document.uri.toString()) {
          htmlView.updateManifest(getManifestContent(gist));
        }
        htmlView.updateJavaScript(document);
      } else if (isPlaygroundManifestFile(gist, document)) {
        htmlView.updateManifest(document.getText());
      } else if (
        includesStylesheet &&
        document.uri === cssEditor!.document.uri
      ) {
        htmlView.updateCSS(document.getText());
      }
    }),
    800
  );

  webViewPanel.onDidDispose(() => {
    documentChangeDisposeable.dispose();
    playgroundRegistry.delete(gist.id);
    closeGistFiles(gist);
    output.dispose();
    vscode.commands.executeCommand("workbench.action.closePanel");
  });

  htmlView.updateManifest(getManifestContent(gist));
  htmlView.updateHTML(includesMarkup ? htmlEditor!.document.getText() : "");
  htmlView.updateJavaScript(jsEditor.document);
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
      `${EXTENSION_ID}.addPlaygroundLibrary`,
      addPlaygroundLibraryCommand
    )
  );
  // warm up libraries
  await getCDNJSLibraries();
}
