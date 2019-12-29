import { debounce } from "debounce";
import * as path from "path";
import * as vscode from "vscode";
import * as config from "../config";
import { EXTENSION_ID, FS_SCHEME, PLAYGROUND_JSON_FILE } from "../constants";
import { IPlaygroundJSON } from "../interfaces/IPlaygroundJSON";
import { Gist } from "../store";
import { newGist } from "../store/actions";
import {
  byteArrayToString,
  closeGistFiles,
  fileNameToUri,
  stringToByteArray
} from "../utils";
import { PlaygroundWebview } from "../webView";
import { addPlaygroundLibraryCommand } from "./addPlaygroundLibraryCommand";
import { getCDNJSLibraries } from "./cdnjs";
export enum PlaygroundLibraryType {
  script = "scripts",
  style = "styles"
}

export enum PlaygroundFileType {
  markup,
  script,
  stylesheet,
  manifest
}

const MarkupLanguage = {
  html: ".html",
  pug: ".pug"
};

const MARKUP_EXTENSIONS = [MarkupLanguage.html, MarkupLanguage.pug];

const StylesheetLanguage = {
  css: ".css",
  scss: ".scss"
};

export const DEFAULT_MANIFEST = {
  scripts: [] as string[],
  styles: [] as string[]
};

const STYLESHEET_EXTENSIONS = [StylesheetLanguage.css, StylesheetLanguage.scss];

const ScriptLanguage = {
  babel: ".babel",
  javascript: ".js",
  javascriptreact: ".jsx",
  typescript: ".ts",
  typescriptreact: ".tsx"
};
const REACT_EXTENSIONS = [
  ScriptLanguage.babel,
  ScriptLanguage.javascriptreact,
  ScriptLanguage.typescriptreact
];

const TYPESCRIPT_EXTENSIONS = [ScriptLanguage.typescript, ...REACT_EXTENSIONS];
const SCRIPT_EXTENSIONS = [ScriptLanguage.javascript, ...TYPESCRIPT_EXTENSIONS];

interface IPlayground {
  gist: Gist;
  webView: PlaygroundWebview;
  webViewPanel: vscode.WebviewPanel;
  console: vscode.OutputChannel;
}

export let activePlayground: IPlayground | null;

export async function closeWebviewPanel(gistId: string) {
  if (activePlayground && activePlayground.gist.id === gistId) {
    activePlayground.webViewPanel.dispose();
  }
}

const isReactFile = (fileName: string) => {
  return REACT_EXTENSIONS.includes(path.extname(fileName));
};

const REACT_SCRIPTS = ["react", "react-dom"];

const includesReactFiles = (gist: Gist) => {
  return Object.keys(gist.files).some(isReactFile);
};

const includesReactScripts = (scripts: string[]) => {
  return REACT_SCRIPTS.every((script) => scripts.includes(script));
};

export const getManifestContent = (gist: Gist) => {
  if (!gist.files[PLAYGROUND_JSON_FILE]) {
    return "";
  }

  const manifest = gist.files[PLAYGROUND_JSON_FILE].content!;
  if (includesReactFiles(gist)) {
    const parsedManifest = JSON.parse(manifest);
    if (!includesReactScripts(parsedManifest.scripts)) {
      parsedManifest.scripts.push(...REACT_SCRIPTS);
      parsedManifest.scripts = [...new Set(parsedManifest.scripts)];

      const content = JSON.stringify(parsedManifest, null, 2);

      vscode.workspace.fs.writeFile(
        fileNameToUri(gist.id, PLAYGROUND_JSON_FILE),
        stringToByteArray(content)
      );

      return content;
    }
  }

  return manifest;
};

async function generateNewPlaygroundFiles() {
  const scriptLanguage = await config.get("playground.scriptLanguage");
  const scriptFileName = `script${ScriptLanguage[scriptLanguage]}`;

  const manifest = {
    ...DEFAULT_MANIFEST
  };

  if (isReactFile(scriptFileName)) {
    manifest.scripts.push(...REACT_SCRIPTS);
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
    const stylesheetLanguage = await config.get(
      "playground.stylesheetLanguage"
    );
    const stylesheetFileName = `style${StylesheetLanguage[stylesheetLanguage]}`;

    files.unshift({
      filename: stylesheetFileName
    });
  }

  if (await config.get("playground.includeMarkup")) {
    const markupLanguage = await config.get("playground.markupLanguage");
    const markupFileName = `index${MarkupLanguage[markupLanguage]}`;

    files.unshift({
      filename: markupFileName
    });
  }

  return files;
}

export function getScriptContent(
  document: vscode.TextDocument,
  manifest: IPlaygroundJSON | undefined
): string | null {
  let content = document.getText();
  if (content.trim() === "") {
    return content;
  }

  const extension = path.extname(document.uri.toString()).toLocaleLowerCase();

  const includesJsx =
    manifest && manifest.scripts && manifest.scripts.includes("react");
  if (TYPESCRIPT_EXTENSIONS.includes(extension) || includesJsx) {
    const typescript = require("typescript");
    const compilerOptions: any = {
      experimentalDecorators: true
    };

    if (includesJsx || REACT_EXTENSIONS.includes(extension)) {
      compilerOptions.jsx = typescript.JsxEmit.React;
    }

    try {
      return typescript.transpile(content, compilerOptions);
    } catch (e) {
      // Something failed when trying to transpile Pug,
      // so don't attempt to return anything
      return null;
    }
  } else {
    return content;
  }
}

function getMarkupContent(document: vscode.TextDocument): string | null {
  let content = document.getText();
  if (content.trim() === "") {
    return content;
  }

  const extension = path.extname(document.uri.toString()).toLocaleLowerCase();
  if (extension === MarkupLanguage.pug) {
    const pug = require("pug");

    try {
      // Something failed when trying to transpile Pug,
      // so don't attempt to return anything
      return pug.render(content);
    } catch (e) {
      return null;
    }
  } else {
    return content;
  }
}

async function getStylesheetContent(
  document: vscode.TextDocument
): Promise<string | null> {
  let content = document.getText();
  if (content.trim() === "") {
    return content;
  }

  const extension = path.extname(document.uri.toString()).toLocaleLowerCase();
  if (extension === StylesheetLanguage.scss) {
    const sass = require("sass");

    try {
      return byteArrayToString(sass.renderSync({ data: content }).css);
    } catch (e) {
      // Something failed when trying to transpile SCSS,
      // so don't attempt to return anything
      return null;
    }
  } else {
    return content;
  }
}

function isPlaygroundManifestFile(gist: Gist, document: vscode.TextDocument) {
  if (gist.id !== document.uri.authority) {
    return false;
  }

  const fileName = path.basename(document.uri.toString().toLowerCase());
  return fileName === PLAYGROUND_JSON_FILE;
}

enum EditorLayoutOrientation {
  horizontal = 0,
  vertical = 1
}

const EditorLayouts = {
  splitOne: {
    orientation: EditorLayoutOrientation.horizontal,
    groups: [{}, {}]
  },
  splitTwo: {
    orientation: EditorLayoutOrientation.horizontal,
    groups: [
      {
        orientation: EditorLayoutOrientation.vertical,
        groups: [{}, {}],
        size: 0.5
      },
      { groups: [{}], size: 0.5 }
    ]
  },
  splitThree: {
    orientation: EditorLayoutOrientation.horizontal,
    groups: [
      {
        orientation: EditorLayoutOrientation.vertical,
        groups: [{}, {}, {}],
        size: 0.5
      },
      { groups: [{}], size: 0.5 }
    ]
  },
  grid: {
    orientation: EditorLayoutOrientation.horizontal,
    groups: [
      {
        orientation: EditorLayoutOrientation.vertical,
        groups: [{}, {}],
        size: 0.5
      },
      {
        orientation: EditorLayoutOrientation.vertical,
        groups: [{}, {}],
        size: 0.5
      }
    ]
  }
};

enum PlaygroundLayout {
  grid = "grid",
  splitLeft = "splitLeft",
  splitRight = "splitRight",
  splitTop = "splitTop"
}

export const getGistFileOfType = (gist: Gist, fileType: PlaygroundFileType) => {
  let extensions: string[];
  switch (fileType) {
    case PlaygroundFileType.markup:
      extensions = MARKUP_EXTENSIONS;
      break;
    case PlaygroundFileType.script:
      extensions = SCRIPT_EXTENSIONS;
      break;
    case PlaygroundFileType.stylesheet:
      extensions = STYLESHEET_EXTENSIONS;
      break;
  }

  return Object.keys(gist.files).find((file) =>
    extensions.includes(path.extname(file))
  );
};

function isPlaygroundDocument(
  gist: Gist,
  document: vscode.TextDocument,
  extensions: string[]
) {
  if (gist.id !== document.uri.authority) {
    return false;
  }

  const extension = path.extname(document.uri.toString()).toLocaleLowerCase();
  return extensions.includes(extension);
}

export async function openPlayground(gist: Gist) {
  const markupFile = getGistFileOfType(gist, PlaygroundFileType.markup);
  const stylesheetFile = getGistFileOfType(gist, PlaygroundFileType.stylesheet);
  const scriptFile = getGistFileOfType(gist, PlaygroundFileType.script);

  const includedFiles = [!!markupFile, !!stylesheetFile, !!scriptFile].filter(
    (file) => file
  ).length;

  const manifestContent = getManifestContent(gist);
  let manifest: IPlaygroundJSON;
  try {
    manifest = JSON.parse(manifestContent);
  } catch (e) {
    manifest = {};
  }

  const playgroundLayout =
    manifest.layout || (await config.get("playground.layout"));

  let editorLayout: any;
  if (includedFiles === 3) {
    editorLayout =
      playgroundLayout === PlaygroundLayout.grid
        ? EditorLayouts.grid
        : EditorLayouts.splitThree;
  } else if (includedFiles === 2) {
    editorLayout = EditorLayouts.splitTwo;
  } else {
    editorLayout = EditorLayouts.splitOne;
  }

  let currentViewColumn = vscode.ViewColumn.One;
  let previewViewColumn = includedFiles + 1;
  if (playgroundLayout === PlaygroundLayout.splitRight) {
    editorLayout = {
      ...editorLayout,
      groups: [...editorLayout.groups].reverse()
    };

    currentViewColumn = vscode.ViewColumn.Two;
    previewViewColumn = vscode.ViewColumn.One;
  } else if (playgroundLayout === PlaygroundLayout.splitTop) {
    editorLayout = {
      ...editorLayout,
      orientation: EditorLayoutOrientation.vertical
    };
  }

  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  await vscode.commands.executeCommand("vscode.setEditorLayout", editorLayout);

  let htmlEditor: vscode.TextEditor;
  if (markupFile) {
    htmlEditor = await vscode.window.showTextDocument(
      fileNameToUri(gist.id, markupFile),
      {
        preview: false,
        viewColumn: currentViewColumn++,
        preserveFocus: true
      }
    );
  }

  let cssEditor: vscode.TextEditor;
  if (stylesheetFile) {
    cssEditor = await vscode.window.showTextDocument(
      fileNameToUri(gist.id, stylesheetFile),
      {
        preview: false,
        viewColumn: currentViewColumn++,
        preserveFocus: true
      }
    );
  }

  let jsEditor: vscode.TextEditor | undefined;
  if (scriptFile) {
    jsEditor = await vscode.window.showTextDocument(
      fileNameToUri(gist.id, scriptFile!),
      {
        preview: false,
        viewColumn: currentViewColumn++,
        preserveFocus: false
      }
    );
  }

  const webViewPanel = vscode.window.createWebviewPanel(
    "gistpad.playgroundPreview",
    "Preview",
    { viewColumn: previewViewColumn, preserveFocus: true },
    { enableScripts: true }
  );

  const output = vscode.window.createOutputChannel("GistPad Playground");

  // In order to provide CodePen interop,
  // we'll look for an optional "scripts"
  // file, which includes the list of external
  // scripts that were added to the pen.
  let scripts: string | undefined;
  if (gist.files["scripts"]) {
    scripts = gist.files["scripts"].content;
  }
  let styles: string | undefined;
  if (gist.files["styles"]) {
    styles = gist.files["styles"].content;
  }

  const htmlView = new PlaygroundWebview(
    webViewPanel.webview,
    output,
    gist,
    scripts,
    styles
  );

  if ((await config.get("playground.showConsole")) || manifest.showConsole) {
    output.show(false);
  }

  const autoRun = await config.get("playground.autoRun");
  const runOnEdit = autoRun === "onEdit";

  const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(
    debounce(async ({ document }) => {
      if (isPlaygroundDocument(gist, document, MARKUP_EXTENSIONS)) {
        const content = getMarkupContent(document);

        if (content !== null) {
          htmlView.updateHTML(content, runOnEdit);
        }
      } else if (isPlaygroundDocument(gist, document, SCRIPT_EXTENSIONS)) {
        // If the user renamed the script file (e.g. from *.js to *.jsx)
        // than we need to update the manifest in case new scripts
        // need to be injected into the webview (e.g. "react").
        if (
          jsEditor &&
          jsEditor.document.uri.toString() !== document.uri.toString()
        ) {
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

        if (jsEditor) {
          // TODO: Only update the JS if the manifest change
          // actually impacts it (e.g. adding/removing react)
          htmlView.updateJavaScript(jsEditor.document, runOnEdit);
        }
      } else if (isPlaygroundDocument(gist, document, STYLESHEET_EXTENSIONS)) {
        const content = await getStylesheetContent(document);
        if (content !== null) {
          htmlView.updateCSS(content, runOnEdit);
        }
      }
    }, 100)
  );

  let documentSaveDisposeable: vscode.Disposable;
  if (!runOnEdit && autoRun === "onSave") {
    documentSaveDisposeable = vscode.workspace.onDidSaveTextDocument(
      async (document) => {
        if (
          document.uri.scheme === FS_SCHEME &&
          document.uri.authority === activePlayground?.gist.id
        ) {
          await htmlView.rebuildWebview();
        }
      }
    );
  }

  htmlView.updateManifest(manifestContent);

  htmlView.updateHTML(
    !!markupFile ? getMarkupContent(htmlEditor!.document) || "" : ""
  );

  htmlView.updateCSS(
    !!stylesheetFile
      ? (await getStylesheetContent(cssEditor!.document)) || ""
      : ""
  );

  if (jsEditor) {
    htmlView.updateJavaScript(jsEditor.document);
  }

  activePlayground = {
    gist,
    webView: htmlView,
    webViewPanel,
    console: output
  };

  await htmlView.rebuildWebview();

  await vscode.commands.executeCommand(
    "setContext",
    "gistpad:inPlayground",
    true
  );

  const autoSave = vscode.workspace
    .getConfiguration("files")
    .get<string>("autoSave");
  let autoSaveInterval: NodeJS.Timer | undefined;
  if (autoSave !== "afterDelay" && (await config.get("playground.autoSave"))) {
    autoSaveInterval = setInterval(async () => {
      for (const document of vscode.workspace.textDocuments) {
        if (document.isDirty && document.uri.scheme === FS_SCHEME) {
          await document.save();
        }
      }
    }, 30000);
  }

  webViewPanel.onDidDispose(() => {
    documentChangeDisposable.dispose();

    if (documentSaveDisposeable) {
      documentSaveDisposeable.dispose();
    }

    activePlayground = null;

    closeGistFiles(gist);
    output.dispose();

    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
    }

    vscode.commands.executeCommand("workbench.action.closePanel");
    vscode.commands.executeCommand("setContext", "gistpad:inPlayground", false);
  });
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
      `${EXTENSION_ID}.addPlaygroundScript`,
      addPlaygroundLibraryCommand.bind(null, PlaygroundLibraryType.script)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_ID}.addPlaygroundStylesheet`,
      addPlaygroundLibraryCommand.bind(null, PlaygroundLibraryType.style)
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

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_ID}.changePlaygroundLayout`,
      async () => {
        const { capital } = require("case");
        const items = Object.keys(PlaygroundLayout).map((layout) => {
          return { label: capital(layout), layout };
        });
        const result = await vscode.window.showQuickPick(items, {
          placeHolder: "Specify the layout to use for playgrounds"
        });

        if (result) {
          await vscode.workspace
            .getConfiguration("gistpad")
            .update("playground.layout", result.layout, true);

          openPlayground(activePlayground!.gist);
        }
      }
    )
  );

  // Warm up the local CDNJS cache
  await getCDNJSLibraries();
}
