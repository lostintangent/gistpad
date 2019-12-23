import { debounce } from "debounce";
import * as path from "path";
import { IPlaygroundJSON } from "src/interfaces/IPlaygroundJSON";
import * as typescript from "typescript";
import * as vscode from "vscode";
import * as config from "../config";
import { EXTENSION_ID, FS_SCHEME, PLAYGROUND_JSON_FILE } from "../constants";
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

interface IPlayground {
  gistId: string;
  webView: PlaygroundWebview;
  webViewPanel: vscode.WebviewPanel;
  console: vscode.OutputChannel;
}

let activePlayground: IPlayground | null;

export async function closeWebviewPanel(gistId: string) {
  if (activePlayground && activePlayground.gistId === gistId) {
    activePlayground.webViewPanel.dispose();
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
      parsedManifest.libraries.push(...REACT_LIBRARIES);
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
    const compilerOptions: typescript.CompilerOptions = {
      experimentalDecorators: true
    };

    if (includesJsx || REACT_EXTENSIONS.includes(extension)) {
      compilerOptions.jsx = typescript.JsxEmit.React;
    }

    content = typescript.transpile(content, compilerOptions);
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
  vscode.commands.executeCommand("setContext", "gistpad:inPlayground", true);

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

  const output = vscode.window.createOutputChannel("GistPad Playground");
  const htmlView = new PlaygroundWebview(webViewPanel.webview, output);

  if (await config.get("playground.showConsole")) {
    output.show(false);
  }

  const autoRun = await config.get("playground.autoRun");
  const runOnEdit = autoRun === "onEdit";

  const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(
    debounce(({ document }) => {
      if (includesMarkup && document.uri === htmlEditor.document.uri) {
        htmlView.updateHTML(document.getText(), runOnEdit);
      } else if (isPlaygroundScriptDocument(gist, document)) {
        // If the user renamed the script file (e.g. from *.js to *.jsx)
        // than we need to update the manifest in case new libraries
        // need to be injected into the wevview (e.g. "react").
        if (jsEditor.document.uri.toString() !== document.uri.toString()) {
          // TODO: Clean up this logic
          const oldFile =
            gist.files[path.basename(jsEditor.document.uri.toString())];
          if (oldFile) {
            gist.files[path.basename(document.uri.toString())] = oldFile;
            delete gist.files[path.basename(jsEditor.document.uri.toString())];

            htmlView.updateManifest(getManifestContent(gist), runOnEdit);
          }
        }
        htmlView.updateJavaScript(document, runOnEdit);
      } else if (isPlaygroundManifestFile(gist, document)) {
        htmlView.updateManifest(document.getText(), runOnEdit);

        // TODO: Only update the JS if the manifest change
        // actually impacts it (e.g. adding/removing react)
        htmlView.updateJavaScript(document, runOnEdit);
      } else if (
        includesStylesheet &&
        document.uri === cssEditor!.document.uri
      ) {
        htmlView.updateCSS(document.getText(), runOnEdit);
      }
    }, 100)
  );

  let documentSaveDisposeable: vscode.Disposable;
  if (!runOnEdit && autoRun === "onSave") {
    documentSaveDisposeable = vscode.workspace.onDidSaveTextDocument(
      async (document) => {
        if (
          document.uri.scheme === FS_SCHEME &&
          document.uri.authority === activePlayground?.gistId
        ) {
          await htmlView.rebuildWebview();
        }
      }
    );
  }

  webViewPanel.onDidDispose(() => {
    documentChangeDisposable.dispose();

    if (documentSaveDisposeable) {
      documentSaveDisposeable.dispose();
    }

    activePlayground = null;

    closeGistFiles(gist);
    output.dispose();

    vscode.commands.executeCommand("workbench.action.closePanel");
    vscode.commands.executeCommand("setContext", "gistpad:inPlayground", false);
  });

  htmlView.updateManifest(getManifestContent(gist));
  htmlView.updateHTML(includesMarkup ? htmlEditor!.document.getText() : "");
  htmlView.updateJavaScript(jsEditor.document);
  htmlView.updateCSS(includesStylesheet ? cssEditor!.document.getText() : "");

  activePlayground = {
    gistId: gist.id,
    webView: htmlView,
    webViewPanel,
    console: output
  };

  await htmlView.rebuildWebview();
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

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_ID}.openPlaygroundConsole`,
      () => {
        if (activePlayground) {
          activePlayground.console.show();
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_ID}.openPlaygroundDeveloperTools`,
      () => {
        vscode.commands.executeCommand(
          "workbench.action.webview.openDeveloperTools"
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_ID}.runPlayground`,
      async () => {
        if (activePlayground) {
          await activePlayground.webView.rebuildWebview();
        }
      }
    )
  );

  // warm up libraries
  await getCDNJSLibraries();
}
