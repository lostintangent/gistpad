import { debounce } from "debounce";
import { reaction } from "mobx";
import * as path from "path";
import * as vscode from "vscode";
import * as config from "../config";
import { EXTENSION_NAME, FS_SCHEME, PLAYGROUND_FILE } from "../constants";
import { getFileContents } from "../fileSystem/api";
import { enableGalleries, loadGalleries } from "../playgrounds/galleryProvider";
import { PlaygroundWebview } from "../playgrounds/webview";
import { Gist, store } from "../store";
import { duplicateGist, newGist } from "../store/actions";
import { GistNode, GistsNode } from "../tree/nodes";
import {
  byteArrayToString,
  closeGistFiles,
  fileNameToUri,
  getGistDescription,
  getGistLabel,
  hasTempGist,
  openGistAsWorkspace,
  stringToByteArray,
  withProgress
} from "../utils";
import { addPlaygroundLibraryCommand } from "./addPlaygroundLibraryCommand";
import { getCDNJSLibraries } from "./cdnjs";

export type ScriptType = "text/javascript" | "module";
export type ReadmeBehavior = "none" | "previewHeader" | "previewFooter";

export interface PlaygroundManifest {
  scripts?: string[];
  styles?: string[];
  layout?: string;
  showConsole?: boolean;
  template?: boolean;
  scriptType?: ScriptType;
  readmeBehavior?: ReadmeBehavior;
}

export enum PlaygroundLibraryType {
  script = "scripts",
  style = "styles"
}

export enum PlaygroundFileType {
  markup,
  script,
  stylesheet,
  manifest,
  readme
}

export const DEFAULT_MANIFEST = {
  scripts: [] as string[],
  styles: [] as string[]
};

const MarkupLanguage = {
  html: ".html",
  pug: ".pug"
};

const MARKUP_EXTENSIONS = [MarkupLanguage.html, MarkupLanguage.pug];

const StylesheetLanguage = {
  css: ".css",
  less: ".less",
  sass: ".sass",
  scss: ".scss"
};

const STYLESHEET_EXTENSIONS = [
  StylesheetLanguage.css,
  StylesheetLanguage.less,
  StylesheetLanguage.sass,
  StylesheetLanguage.scss
];

const ScriptLanguage = {
  babel: ".babel",
  javascript: ".js",
  javascriptmodule: ".mjs",
  javascriptreact: ".jsx",
  typescript: ".ts",
  typescriptreact: ".tsx"
};

const REACT_EXTENSIONS = [
  ScriptLanguage.babel,
  ScriptLanguage.javascriptreact,
  ScriptLanguage.typescriptreact
];

const MODULE_EXTENSIONS = [ScriptLanguage.javascriptmodule];

const TYPESCRIPT_EXTENSIONS = [ScriptLanguage.typescript, ...REACT_EXTENSIONS];

const SCRIPT_EXTENSIONS = [
  ScriptLanguage.javascript,
  ...MODULE_EXTENSIONS,
  ...TYPESCRIPT_EXTENSIONS
];

const README_EXTENSIONS = [".md", ".markdown"];

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

export const getManifestContent = async (gist: Gist) => {
  if (!gist.files[PLAYGROUND_FILE]) {
    return "";
  }

  const manifest = await getFileContents(gist.files[PLAYGROUND_FILE]);
  if (includesReactFiles(gist)) {
    const parsedManifest = JSON.parse(manifest);
    if (!includesReactScripts(parsedManifest.scripts)) {
      parsedManifest.scripts.push(...REACT_SCRIPTS);
      parsedManifest.scripts = [...new Set(parsedManifest.scripts)];

      const content = JSON.stringify(parsedManifest, null, 2);

      vscode.workspace.fs.writeFile(
        fileNameToUri(gist.id, PLAYGROUND_FILE),
        stringToByteArray(content)
      );

      return content;
    }
  }

  return manifest;
};

const MARKUP_BASE_NAME = "index";
const SCRIPT_BASE_NAME = "script";
const STYLESHEET_BASE_NAME = "style";
const README_BASE_NAME = "README";

async function generateNewPlaygroundFiles() {
  const manifest = {
    ...DEFAULT_MANIFEST
  };

  const files = [];

  if (await config.get("playgrounds.includeScript")) {
    const scriptLanguage = await config.get("playgrounds.scriptLanguage");
    const scriptFileName = `${SCRIPT_BASE_NAME}${ScriptLanguage[scriptLanguage]}`;

    files.push({
      filename: scriptFileName
    });

    if (isReactFile(scriptFileName)) {
      manifest.scripts.push(...REACT_SCRIPTS);
    }
  }

  if (config.get("playgrounds.includeStylesheet")) {
    const stylesheetLanguage = config.get("playgrounds.stylesheetLanguage");
    const stylesheetFileName = `${STYLESHEET_BASE_NAME}${StylesheetLanguage[stylesheetLanguage]}`;

    files.push({
      filename: stylesheetFileName
    });
  }

  if (config.get("playgrounds.includeMarkup")) {
    const markupLanguage = config.get("playgrounds.markupLanguage");
    const markupFileName = `${MARKUP_BASE_NAME}${MarkupLanguage[markupLanguage]}`;

    files.push({
      filename: markupFileName
    });
  }

  files.push({
    filename: PLAYGROUND_FILE,
    content: JSON.stringify(manifest, null, 2)
  });

  return files;
}

export function getScriptContent(
  document: vscode.TextDocument,
  manifest: PlaygroundManifest | undefined
): [string, boolean] | null {
  const extension = path.extname(document.uri.toString()).toLocaleLowerCase();
  const isModule = MODULE_EXTENSIONS.includes(extension);

  let content = document.getText();
  if (content.trim() === "") {
    return [content, isModule];
  }

  const includesJsx =
    manifest && manifest.scripts && manifest.scripts.includes("react");
  if (TYPESCRIPT_EXTENSIONS.includes(extension) || includesJsx) {
    const typescript = require("typescript");
    const compilerOptions: any = {
      experimentalDecorators: true,
      target: "ES2018"
    };

    if (includesJsx || REACT_EXTENSIONS.includes(extension)) {
      compilerOptions.jsx = typescript.JsxEmit.React;
    }

    try {
      return [typescript.transpile(content, compilerOptions), isModule];
    } catch (e) {
      // Something failed when trying to transpile Pug,
      // so don't attempt to return anything
      return null;
    }
  } else {
    return [content, isModule];
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

function getReadmeContent(readme: string): string | null {
  if (readme.trim() === "") {
    return readme;
  }

  const markdown = require("markdown-it")();

  try {
    // Something failed when trying to transpile Pug,
    // so don't attempt to return anything
    return markdown.render(readme);
  } catch (e) {
    return null;
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
  if (
    extension === StylesheetLanguage.scss ||
    extension === StylesheetLanguage.sass
  ) {
    const sass = require("sass");

    try {
      return byteArrayToString(
        sass.renderSync({
          data: content,
          indentedSyntax: extension === StylesheetLanguage.sass
        }).css
      );
    } catch (e) {
      // Something failed when trying to transpile SCSS,
      // so don't attempt to return anything
      return null;
    }
  } else if (extension === StylesheetLanguage.less) {
    try {
      const less = require("less").default;
      const output = await less.render(content);
      return output.css;
    } catch (e) {
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
  return fileName === PLAYGROUND_FILE;
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

function loadPlaygroundManifests() {
  store.gists.concat(store.starredGists).forEach((gist) => {
    const manifest = gist.files[PLAYGROUND_FILE];
    if (manifest) {
      vscode.workspace.fs.readFile(fileNameToUri(gist.id, PLAYGROUND_FILE));
    }
  });
}

enum PlaygroundLayout {
  grid = "grid",
  preview = "preview",
  splitBottom = "splitBottom",
  splitLeft = "splitLeft",
  splitLeftTabbed = "splitLeftTabbed",
  splitRight = "splitRight",
  splitRightTabbed = "splitRightTabbed",
  splitTop = "splitTop"
}

export const getGistFileOfType = (gist: Gist, fileType: PlaygroundFileType) => {
  let extensions: string[];
  let fileBaseName: string;
  switch (fileType) {
    case PlaygroundFileType.markup:
      extensions = MARKUP_EXTENSIONS;
      fileBaseName = MARKUP_BASE_NAME;
      break;
    case PlaygroundFileType.script:
      extensions = SCRIPT_EXTENSIONS;
      fileBaseName = SCRIPT_BASE_NAME;
      break;
    case PlaygroundFileType.readme:
      extensions = README_EXTENSIONS;
      fileBaseName = README_BASE_NAME;
      break;
    case PlaygroundFileType.stylesheet:
    default:
      extensions = STYLESHEET_EXTENSIONS;
      fileBaseName = STYLESHEET_BASE_NAME;
      break;
  }

  const fileCandidates = extensions.map(
    (extension) => `${fileBaseName}${extension}`
  );

  return Object.keys(gist.files).find((file) => fileCandidates.includes(file));
};

function isPlaygroundDocument(
  gist: Gist,
  document: vscode.TextDocument,
  fileType: PlaygroundFileType
) {
  if (gist.id !== document.uri.authority) {
    return false;
  }

  let extensions: string[];
  let fileBaseName: string;
  switch (fileType) {
    case PlaygroundFileType.markup:
      extensions = MARKUP_EXTENSIONS;
      fileBaseName = MARKUP_BASE_NAME;
      break;
    case PlaygroundFileType.script:
      extensions = SCRIPT_EXTENSIONS;
      fileBaseName = SCRIPT_BASE_NAME;
      break;
    case PlaygroundFileType.readme:
      extensions = README_EXTENSIONS;
      fileBaseName = README_BASE_NAME;
      break;
    case PlaygroundFileType.stylesheet:
    default:
      extensions = STYLESHEET_EXTENSIONS;
      fileBaseName = STYLESHEET_BASE_NAME;
      break;
  }

  const fileCandidates = extensions.map(
    (extension) => `${fileBaseName}${extension}`
  );

  return fileCandidates.includes(path.basename(document.uri.toString()));
}

function duplicatePlayground(
  gistId: string,
  isPublic: boolean,
  description: string,
  saveGist: boolean = true
) {
  withProgress("Creating Playground...", () =>
    duplicateGist(gistId, isPublic, description, saveGist)
  );
}

const NO_TEMPLATE_GIST_ITEM = {
  label: "$(arrow-right) Continue without a template",
  alwaysShow: true,
  description: "Create a playground based on your configured GistPad settings"
};

async function newPlaygroundWithoutTemplate(
  description: string | undefined,
  isPublic: boolean = true,
  openAsWorkspace: boolean = false,
  saveGist: boolean = true
) {
  const gist: Gist = await withProgress("Creating Playground...", async () =>
    newGist(
      await generateNewPlaygroundFiles(),
      isPublic,
      description,
      false,
      saveGist
    )
  );

  if (openAsWorkspace) {
    openGistAsWorkspace(gist.id);
  } else {
    openPlayground(gist);
  }
}

async function promptForPlaygroundDescription(
  gistId: string | null,
  isPublic: boolean,
  openAsWorkspace: boolean,
  inWizard: boolean = true,
  description?: string
) {
  const inputBox = await vscode.window.createInputBox();

  if (inWizard) {
    inputBox.totalSteps = 2;
    inputBox.step = 2;
    inputBox.buttons = [vscode.QuickInputButtons.Back, NO_GIST_BUTTON];
    inputBox.onDidTriggerButton((button) => {
      if (button === vscode.QuickInputButtons.Back) {
        newPlaygroundInternal(isPublic, undefined, openAsWorkspace);
      } else {
        inputBox.hide();

        if (gistId) {
          duplicatePlayground(gistId, isPublic, description!, false);
        } else {
          newPlaygroundWithoutTemplate(
            "New Playground",
            isPublic,
            openAsWorkspace,
            false
          );
        }
      }
    });
  } else {
    inputBox.buttons = [CONFIGURE_GALLERIES_BUTTON];
    inputBox.onDidTriggerButton((e) => {
      promptForGalleryConfiguration(isPublic, openAsWorkspace);
    });
  }

  inputBox.prompt = "Enter the description of the playground (optional)";
  inputBox.title = "Create new " + (isPublic ? "" : "secret ") + "playground";

  inputBox.onDidAccept(() => {
    inputBox.hide();

    if (gistId) {
      duplicatePlayground(gistId, isPublic, inputBox.value);
    } else {
      newPlaygroundWithoutTemplate(inputBox.value, isPublic, openAsWorkspace);
    }
  });

  inputBox.show();
}

async function promptForGalleryConfiguration(
  isPublic: boolean,
  openAsWorkspace: boolean = false
) {
  const quickPick = vscode.window.createQuickPick();
  quickPick.title = "Configure template galleries";
  quickPick.placeholder =
    "Select the galleries you'd like to display templates from";
  quickPick.canSelectMany = true;

  const galleries = (await loadGalleries()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  quickPick.items = galleries;
  quickPick.selectedItems = galleries.filter((gallery) => gallery.enabled);

  quickPick.buttons = [vscode.QuickInputButtons.Back];
  quickPick.onDidTriggerButton((e) => {
    if (e === vscode.QuickInputButtons.Back) {
      return newPlaygroundInternal(isPublic, undefined, openAsWorkspace);
    }
  });

  quickPick.onDidAccept(async () => {
    const galleries = quickPick.selectedItems.map((item) => (item as any).id);

    quickPick.busy = true;
    await enableGalleries(galleries);
    quickPick.busy = false;

    quickPick.hide();

    return newPlaygroundInternal(isPublic, undefined, openAsWorkspace);
  });

  quickPick.show();
}

let CONFIGURE_GALLERIES_BUTTON: vscode.QuickInputButton;
let NO_GIST_BUTTON: vscode.QuickInputButton;

async function newPlaygroundInternal(
  isPublic: boolean,
  node?: GistsNode,
  openAsWorkspace: boolean = false
) {
  const quickPick = vscode.window.createQuickPick();
  quickPick.title = "Create new " + (isPublic ? "" : "secret ") + "playground";
  quickPick.placeholder = "Select the playground template to use";
  quickPick.totalSteps = 2;
  quickPick.step = 1;
  quickPick.matchOnDescription = true;

  const galleries = await loadGalleries();

  const templates = galleries
    .filter((gallery) => gallery.enabled)
    .flatMap((gallery) => gallery.templates);
  for (const gist of store.gists.concat(store.starredGists)) {
    const manifest = gist.files[PLAYGROUND_FILE];
    if (manifest && manifest.content) {
      try {
        const manifestContent = JSON.parse(manifest.content);
        if (manifestContent.template) {
          templates.push({
            label: getGistLabel(gist),
            description: getGistDescription(gist),
            gist: gist.id
          });
        }
      } catch {
        // No op
      }
    }
  }

  if (templates.length === 0) {
    return await promptForPlaygroundDescription(
      null,
      isPublic,
      openAsWorkspace,
      false
    );
  }

  quickPick.items = [
    ...templates.sort((a, b) => a.label.localeCompare(b.label)),
    NO_TEMPLATE_GIST_ITEM
  ];

  quickPick.buttons = [CONFIGURE_GALLERIES_BUTTON];
  quickPick.onDidTriggerButton((e) => {
    promptForGalleryConfiguration(isPublic, openAsWorkspace);
  });

  quickPick.onDidAccept(async () => {
    quickPick.hide();

    const template = quickPick.selectedItems[0];
    const gistId = (template as any).gist;

    if (store.isSignedIn) {
      promptForPlaygroundDescription(
        gistId,
        isPublic,
        openAsWorkspace,
        true,
        template.label
      );
    } else {
      // If the user is anonymous, and is creating a playground, then
      // there's no value in asking them for a description, since
      // the playground may be entirely ephemeral.
      if (gistId) {
        duplicatePlayground(gistId, isPublic, template.label);
      } else {
        newPlaygroundWithoutTemplate(
          "New Playground",
          isPublic,
          openAsWorkspace
        );
      }
    }
  });

  quickPick.show();
}

export async function openPlayground(gist: Gist) {
  const markupFile = getGistFileOfType(gist, PlaygroundFileType.markup);
  const stylesheetFile = getGistFileOfType(gist, PlaygroundFileType.stylesheet);
  const scriptFile = getGistFileOfType(gist, PlaygroundFileType.script);
  const readmeFile = getGistFileOfType(gist, PlaygroundFileType.readme);

  const includedFiles = [!!markupFile, !!stylesheetFile, !!scriptFile].filter(
    (file) => file
  ).length;

  const manifestContent = await getManifestContent(gist);
  let manifest: PlaygroundManifest;
  try {
    manifest = JSON.parse(manifestContent);
  } catch (e) {
    manifest = {};
  }

  const playgroundLayout = manifest.layout || config.get("playgrounds.layout");

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
  } else if (playgroundLayout === PlaygroundLayout.splitBottom) {
    editorLayout = {
      orientation: EditorLayoutOrientation.vertical,
      groups: [...editorLayout.groups].reverse()
    };

    currentViewColumn = vscode.ViewColumn.Two;
    previewViewColumn = vscode.ViewColumn.One;
  } else if (playgroundLayout === PlaygroundLayout.splitLeftTabbed) {
    editorLayout = EditorLayouts.splitOne;
    previewViewColumn = vscode.ViewColumn.Two;
  } else if (playgroundLayout === PlaygroundLayout.splitRightTabbed) {
    editorLayout = EditorLayouts.splitOne;

    currentViewColumn = vscode.ViewColumn.Two;
    previewViewColumn = vscode.ViewColumn.One;
  }

  await vscode.commands.executeCommand("workbench.action.closeAllEditors");

  // The preview layout mode only shows a single file,
  // so there's no need to set a custom editor layout for it.
  if (playgroundLayout !== PlaygroundLayout.preview) {
    await vscode.commands.executeCommand(
      "vscode.setEditorLayout",
      editorLayout
    );
  }

  let htmlDocument: vscode.TextDocument;
  if (markupFile) {
    htmlDocument = await vscode.workspace.openTextDocument(
      fileNameToUri(gist.id, markupFile)
    );

    if (playgroundLayout !== PlaygroundLayout.preview) {
      vscode.window.showTextDocument(htmlDocument, {
        preview: false,
        viewColumn: currentViewColumn,
        preserveFocus: false
      });

      if (
        playgroundLayout !== PlaygroundLayout.splitLeftTabbed &&
        playgroundLayout !== PlaygroundLayout.splitRightTabbed
      ) {
        currentViewColumn++;
      }
    }
  }

  let cssDocument: vscode.TextDocument;
  if (stylesheetFile) {
    cssDocument = await vscode.workspace.openTextDocument(
      fileNameToUri(gist.id, stylesheetFile)
    );

    if (playgroundLayout !== PlaygroundLayout.preview) {
      vscode.window.showTextDocument(cssDocument, {
        preview: false,
        viewColumn: currentViewColumn,
        preserveFocus: true
      });

      if (
        playgroundLayout !== PlaygroundLayout.splitLeftTabbed &&
        playgroundLayout !== PlaygroundLayout.splitRightTabbed
      ) {
        currentViewColumn++;
      }
    }
  }

  let jsDocument: vscode.TextDocument;
  if (scriptFile) {
    jsDocument = await vscode.workspace.openTextDocument(
      fileNameToUri(gist.id, scriptFile!)
    );

    if (playgroundLayout !== PlaygroundLayout.preview) {
      vscode.window.showTextDocument(jsDocument, {
        preview: false,
        viewColumn: currentViewColumn,
        preserveFocus: true
      });
    }
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
    scripts = await getFileContents(gist.files["scripts"]);
  }
  let styles: string | undefined;
  if (gist.files["styles"]) {
    styles = await getFileContents(gist.files["styles"]);
  }

  const htmlView = new PlaygroundWebview(
    webViewPanel.webview,
    output,
    gist,
    scripts,
    styles
  );

  if (config.get("playgrounds.showConsole") || manifest.showConsole) {
    output.show(false);
  }

  const autoRun = config.get("playgrounds.autoRun");
  const runOnEdit = autoRun === "onEdit";

  const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(
    debounce(async ({ document }) => {
      if (isPlaygroundDocument(gist, document, PlaygroundFileType.markup)) {
        const content = getMarkupContent(document);

        if (content !== null) {
          htmlView.updateHTML(content, runOnEdit);
        }
      } else if (
        isPlaygroundDocument(gist, document, PlaygroundFileType.script)
      ) {
        // If the user renamed the script file (e.g. from *.js to *.jsx)
        // than we need to update the manifest in case new scripts
        // need to be injected into the webview (e.g. "react").
        if (
          jsDocument &&
          jsDocument.uri.toString() !== document.uri.toString()
        ) {
          // TODO: Clean up this logic
          const oldFile = gist.files[path.basename(jsDocument.uri.toString())];
          if (oldFile) {
            gist.files[path.basename(document.uri.toString())] = oldFile;
            delete gist.files[path.basename(jsDocument.uri.toString())];

            htmlView.updateManifest(await getManifestContent(gist), runOnEdit);
          }
        }
        htmlView.updateJavaScript(document, runOnEdit);
      } else if (isPlaygroundManifestFile(gist, document)) {
        htmlView.updateManifest(document.getText(), runOnEdit);

        if (jsDocument) {
          manifest = JSON.parse(document.getText());

          // TODO: Only update the JS if the manifest change
          // actually impacts it (e.g. adding/removing react)
          htmlView.updateJavaScript(jsDocument, runOnEdit);
        }
      } else if (
        isPlaygroundDocument(gist, document, PlaygroundFileType.stylesheet)
      ) {
        const content = await getStylesheetContent(document);
        if (content !== null) {
          htmlView.updateCSS(content, runOnEdit);
        }
      } else if (
        isPlaygroundDocument(gist, document, PlaygroundFileType.readme)
      ) {
        const content = await getReadmeContent(document.getText());
        if (content !== null) {
          htmlView.updateReadme(content, runOnEdit);
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
    !!markupFile ? getMarkupContent(htmlDocument!) || "" : ""
  );
  htmlView.updateCSS(
    !!stylesheetFile ? (await getStylesheetContent(cssDocument!)) || "" : ""
  );

  if (jsDocument!) {
    htmlView.updateJavaScript(jsDocument!);
  }

  if (readmeFile) {
    const content = getReadmeContent(
      byteArrayToString(
        await vscode.workspace.fs.readFile(fileNameToUri(gist.id, readmeFile))
      )
    );

    htmlView.updateReadme(content || "");
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

  store.activeGist = gist;

  const autoSave = vscode.workspace
    .getConfiguration("files")
    .get<string>("autoSave");
  let autoSaveInterval: any;

  const isOwner = gist.owner && gist.owner.login === store.login;
  if (
    autoSave !== "afterDelay" && // Don't enable autoSave if the end-user has already configured it
    config.get("playgrounds.autoSave") &&
    isOwner // You can't edit gists you don't own, so it doesn't make sense to attempt to auto-save these files
  ) {
    autoSaveInterval = setInterval(async () => {
      vscode.commands.executeCommand("workbench.action.files.saveAll");
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
    store.activeGist = null;
  });
}

export async function registerPlaygroundCommands(
  context: vscode.ExtensionContext
) {
  CONFIGURE_GALLERIES_BUTTON = {
    iconPath: {
      dark: vscode.Uri.file(
        context.asAbsolutePath("images/dark/configure.svg")
      ),
      light: vscode.Uri.file(
        context.asAbsolutePath("images/light/configure.svg")
      )
    },
    tooltip: "Configure Template Galleries"
  };

  NO_GIST_BUTTON = {
    iconPath: {
      dark: vscode.Uri.file(context.asAbsolutePath("images/dark/cancel.svg")),
      light: vscode.Uri.file(context.asAbsolutePath("images/light/cancel.svg"))
    },
    tooltip: "Don't create gist"
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.newPlayground`,
      newPlaygroundInternal.bind(null, true)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.newSecretPlayground`,
      newPlaygroundInternal.bind(null, false)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.addPlaygroundLibrary`,
      async () => {
        const response = await vscode.window.showQuickPick(
          [
            {
              label: "Script",
              description:
                "Adds a <script> reference, before your playground script",
              libraryType: PlaygroundLibraryType.script
            },
            {
              label: "Stylesheet",
              description:
                "Adds a <link rel='stylesheet' /> reference, before your playground styles",
              libraryType: PlaygroundLibraryType.style
            }
          ],
          {
            placeHolder: "Select the library type you'd like to add"
          }
        );

        if (response) {
          addPlaygroundLibraryCommand(response.libraryType);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.openPlaygroundConsole`,
      () => {
        if (activePlayground) {
          activePlayground.console.show();
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.openPlaygroundDeveloperTools`,
      () => {
        vscode.commands.executeCommand(
          "workbench.action.webview.openDeveloperTools"
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.runPlayground`,
      async () => {
        if (activePlayground) {
          await activePlayground.webView.rebuildWebview();
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.changePlaygroundLayout`,
      async () => {
        const { capital } = require("case");
        const items = Object.keys(PlaygroundLayout).map((layout) => {
          return { label: capital(layout), layout };
        });
        const result = await vscode.window.showQuickPick(items, {
          placeHolder: "Select the layout to use for playgrounds"
        });

        if (result) {
          await vscode.workspace
            .getConfiguration("gistpad")
            .update("playgrounds.layout", result.layout, true);

          openPlayground(activePlayground!.gist);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.openGistInBlocks`,
      async (node: GistNode) => {
        vscode.env.openExternal(
          vscode.Uri.parse(
            `https://bl.ocks.org/${node.gist.owner.login}/${node.gist.id}`
          )
        );
      }
    )
  );

  // Pre-cache the CDNJS, template galleries,
  // and user templates, as soon as the user
  // has logged in and their gists have been loaded.
  reaction(
    () => [store.isSignedIn, store.isLoading],
    ([isSignedIn, isLoading]) => {
      if (isSignedIn && !isLoading) {
        getCDNJSLibraries();
        loadPlaygroundManifests();
      }
    }
  );

  // Give the option to save new temp playgrounds into their
  // own Gist account, if there is a new temp gist open, and
  // the user is now signed in.
  reaction(
    () => [store.isSignedIn],
    async ([isSignedIn]) => {
      if (hasTempGist(store)) {
        // TODO: This is where we can migrate the temp gist into
        // the user's Gist account, now that they have signed in.
      }
    }
  );
}
