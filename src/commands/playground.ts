import Axios from "axios";
import { debounce } from "debounce";
import * as path from "path";
import * as vscode from "vscode";
import * as config from "../config";
import { EXTENSION_NAME, FS_SCHEME, PLAYGROUND_JSON_FILE } from "../constants";
import { log } from "../logger";
import { PlaygroundWebview } from "../playgrounds/webview";
import { Gist, store } from "../store";
import { duplicateGist, newGist } from "../store/actions";
import { GistsNode } from "../tree/nodes";
import {
  byteArrayToString,
  closeGistFiles,
  fileNameToUri,
  openGistAsWorkspace,
  showGistQuickPick,
  sortGists,
  stringToByteArray,
  withProgress
} from "../utils";
import { addPlaygroundLibraryCommand } from "./addPlaygroundLibraryCommand";
import { getCDNJSLibraries } from "./cdnjs";

export interface PlaygroundManifest {
  scripts?: string[];
  styles?: string[];
  layout?: string;
  showConsole?: boolean;
}

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

interface GalleryTemplate {
  label: string;
  description: string;
  gist: string;
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

const MARKUP_BASE_NAME = "index";
const SCRIPT_BASE_NAME = "script";
const STYLESHEET_BASE_NAME = "style";

async function generateNewPlaygroundFiles() {
  const scriptLanguage = await config.get("playgrounds.scriptLanguage");
  const scriptFileName = `${SCRIPT_BASE_NAME}${ScriptLanguage[scriptLanguage]}`;

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

  if (await config.get("playgrounds.includeStylesheet")) {
    const stylesheetLanguage = await config.get(
      "playgrounds.stylesheetLanguage"
    );
    const stylesheetFileName = `${STYLESHEET_BASE_NAME}${StylesheetLanguage[stylesheetLanguage]}`;

    files.unshift({
      filename: stylesheetFileName
    });
  }

  if (await config.get("playgrounds.includeMarkup")) {
    const markupLanguage = await config.get("playgrounds.markupLanguage");
    const markupFileName = `${MARKUP_BASE_NAME}${MarkupLanguage[markupLanguage]}`;

    files.unshift({
      filename: markupFileName
    });
  }

  return files;
}

export function getScriptContent(
  document: vscode.TextDocument,
  manifest: PlaygroundManifest | undefined
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
  preview = "preview",
  splitLeft = "splitLeft",
  splitRight = "splitRight",
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
  extensions: string[]
) {
  if (gist.id !== document.uri.authority) {
    return false;
  }

  const extension = path.extname(document.uri.toString()).toLocaleLowerCase();
  return extensions.includes(extension);
}

const NO_TEMPLATE_GIST_ITEM = "$(circle-slash) Don't use a template";
const SELECT_OWN_GIST_ITEM = "$(gist-new) Select your own gist...";
const SELECT_STARRED_GIST_ITEM = "$(star) Select a starred gist...";
const SELECT_TEMPLATE_ITEMS = [
  {
    label: NO_TEMPLATE_GIST_ITEM,
    alwaysShow: true,
    description:
      'Create a "vanilla.js" playground based on your configured GistPad settings'
  },
  {
    label: SELECT_OWN_GIST_ITEM,
    alwaysShow: true,
    description: `Create a playground from one of your own gists (tagged with #template)`
  },
  {
    label: SELECT_STARRED_GIST_ITEM,
    alwaysShow: true,
    description:
      "Create a playground from a gist you've starred (tagged with #template)"
  }
];

function duplicatePlayground(
  gistId: string,
  isPublic: boolean,
  description: string
) {
  withProgress("Creating Playground...", () =>
    duplicateGist(gistId, isPublic, description)
  );
}

const KNOWN_GALLERY_ROOT =
  "https://cdn.jsdelivr.net/gh/vsls-contrib/gistpad/galleries/";
const KnownGalleries = ["web"];

let galleryTemplates: GalleryTemplate[] = [];
async function loadGalleryTemplates() {
  const galleries: string[] = await config.get(
    "playgrounds.templates.galleries"
  );

  let templates: GalleryTemplate[] = [];
  for (let gallery of galleries) {
    if (KnownGalleries.includes(gallery)) {
      gallery = `${KNOWN_GALLERY_ROOT}${gallery}.json`;
    }

    try {
      const { data } = await Axios.get(gallery);
      templates.push(...data.templates);
    } catch (e) {
      log.info(
        `Unable to load templates from the following gallery: ${gallery}`
      );
    }
  }

  galleryTemplates = templates.sort((a, b) => a.label.localeCompare(b.label));
}

async function selectTemplateFromGists(
  gists: Gist[],
  isPublic: boolean,
  message: string
) {
  const templateTagName: string = await config.get(
    "playgrounds.templates.tagName"
  );

  const templategTag = `#${templateTagName}`;

  const templates = sortGists(gists).filter((gist) =>
    gist.description.includes(templategTag)
  );

  if (templates.length === 0) {
    return vscode.window.showInformationMessage(
      `${message} (#${templateTagName})`
    );
  }

  const selected = await showGistQuickPick(
    templates,
    "Select the gist you'd like to create a playground from"
  );

  if (selected) {
    duplicatePlayground(
      selected.id,
      isPublic,
      selected.label.replace(templategTag, "")
    );
  }
}

async function newPlaygroundInternal(
  isPublic: boolean,
  node?: GistsNode,
  openAsWorkspace: boolean = false
) {
  const quickPick = vscode.window.createQuickPick();
  quickPick.title = "Create new " + (isPublic ? "" : "secret ") + "playground";
  quickPick.placeholder = "Select the playground template to use";

  if (galleryTemplates.length > 0) {
    quickPick.items = [...galleryTemplates, ...SELECT_TEMPLATE_ITEMS];
  } else {
    quickPick.items = [...SELECT_TEMPLATE_ITEMS];
  }

  quickPick.show();

  quickPick.onDidAccept(async () => {
    quickPick.hide();

    const template = quickPick.selectedItems[0];
    switch (template.label) {
      case SELECT_OWN_GIST_ITEM:
        return selectTemplateFromGists(
          store.gists,
          isPublic,
          "You haven't tagged any of your gists as templates"
        );
      case SELECT_STARRED_GIST_ITEM:
        return selectTemplateFromGists(
          store.starredGists,
          isPublic,
          "You haven't starred any gists that are tagged as templates"
        );
      case NO_TEMPLATE_GIST_ITEM: {
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
              isPublic,
              description,
              false
            )
        );

        if (openAsWorkspace) {
          openGistAsWorkspace(gist.id);
        } else {
          openPlayground(gist);
        }
      }
      default:
        duplicatePlayground(
          (<GalleryTemplate>template).gist,
          isPublic,
          template.label
        );
    }
  });
}

export async function openPlayground(gist: Gist) {
  const markupFile = getGistFileOfType(gist, PlaygroundFileType.markup);
  const stylesheetFile = getGistFileOfType(gist, PlaygroundFileType.stylesheet);
  const scriptFile = getGistFileOfType(gist, PlaygroundFileType.script);

  const includedFiles = [!!markupFile, !!stylesheetFile, !!scriptFile].filter(
    (file) => file
  ).length;

  const manifestContent = getManifestContent(gist);
  let manifest: PlaygroundManifest;
  try {
    manifest = JSON.parse(manifestContent);
  } catch (e) {
    manifest = {};
  }

  const playgroundLayout =
    manifest.layout || (await config.get("playgrounds.layout"));

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
        viewColumn: currentViewColumn++,
        preserveFocus: false
      });
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
        viewColumn: currentViewColumn++,
        preserveFocus: true
      });
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
        viewColumn: currentViewColumn++,
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

  if ((await config.get("playgrounds.showConsole")) || manifest.showConsole) {
    output.show(false);
  }

  const autoRun = await config.get("playgrounds.autoRun");
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
          jsDocument &&
          jsDocument.uri.toString() !== document.uri.toString()
        ) {
          // TODO: Clean up this logic
          const oldFile = gist.files[path.basename(jsDocument.uri.toString())];
          if (oldFile) {
            gist.files[path.basename(document.uri.toString())] = oldFile;
            delete gist.files[path.basename(jsDocument.uri.toString())];

            htmlView.updateManifest(getManifestContent(gist), runOnEdit);
          }
        }
        htmlView.updateJavaScript(document, runOnEdit);
      } else if (isPlaygroundManifestFile(gist, document)) {
        htmlView.updateManifest(document.getText(), runOnEdit);

        if (jsDocument) {
          // TODO: Only update the JS if the manifest change
          // actually impacts it (e.g. adding/removing react)
          htmlView.updateJavaScript(jsDocument, runOnEdit);
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
    !!markupFile ? getMarkupContent(htmlDocument!) || "" : ""
  );
  htmlView.updateCSS(
    !!stylesheetFile ? (await getStylesheetContent(cssDocument!)) || "" : ""
  );

  if (jsDocument!) {
    htmlView.updateJavaScript(jsDocument!);
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

  const isOwner = gist.owner && gist.owner.login === store.login;
  if (
    autoSave !== "afterDelay" && // Don't enable autoSave if the end-user has already configured it
    (await config.get("playgrounds.autoSave")) &&
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
  });
}

export async function registerPlaygroundCommands(
  context: vscode.ExtensionContext
) {
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

  // Warm up the local CDNJS cache
  getCDNJSLibraries();
  loadGalleryTemplates();
}
