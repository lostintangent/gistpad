import Axios from "axios";
import { debounce } from "debounce";
import { reaction } from "mobx";
import * as path from "path";
import * as vscode from "vscode";
import * as config from "../config";
import { EXTENSION_NAME, FS_SCHEME, PLAYGROUND_FILE } from "../constants";
import { IPlaygroundManifest } from "../interfaces/IPlaygroundManifest";
import {
  GalleryTemplate,
  PlaygroundFileType,
  PlaygroundLibraryType
} from "../interfaces/PlaygroundTypes";
import { log } from "../logger";
import { RenderPlaygroundHtml } from "../playgrounds/renderPlaygroundHtml";
import { PlaygroundWebview } from "../playgrounds/webview";
import { webviewControlScript } from "../playgrounds/webviewControlScript";
import { Gist, store } from "../store";
import { duplicateGist, newGist } from "../store/actions";
import { GistsNode } from "../tree/nodes";
import {
  closeGistFiles,
  fileNameToUri,
  getGistDescription,
  getGistLabel,
  openGistAsWorkspace,
  withProgress
} from "../utils";
import { getManifestContent } from "../utils/getManifestContent";
import { isReactFile } from "../utils/isReactFile";
import { addPlaygroundLibraryCommand } from "./addPlaygroundLibraryCommand";
import { getCDNJSLibraries } from "./cdnjs";
import {
  DEFAULT_MANIFEST,
  MarkupLanguage,
  MARKUP_BASE_NAME,
  MARKUP_EXTENSIONS,
  REACT_SCRIPTS,
  ScriptLanguage,
  SCRIPT_BASE_NAME,
  SCRIPT_EXTENSIONS,
  StylesheetLanguage,
  STYLESHEET_BASE_NAME,
  STYLESHEET_EXTENSIONS
} from "./constants";

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
      (vscode.workspace as any).fs.readFile(
        fileNameToUri(gist.id, PLAYGROUND_FILE)
      );
    }
  });
}

enum PlaygroundLayout {
  grid = "grid",
  preview = "preview",
  splitLeft = "splitLeft",
  splitRight = "splitRight",
  splitTop = "splitTop"
}

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
  description: string
) {
  withProgress("Creating Playground...", () =>
    duplicateGist(gistId, isPublic, description)
  );
}
const KnownGalleries = new Map([
  [
    "web",
    "https://gist.githubusercontent.com/lostintangent/ce7e5c20f94a7f52a5cec1f22cebec18/raw/793777de81ea634ba5e84ecd5ded167b26baa45d/gallery.json"
  ]
]);

let galleryTemplates: GalleryTemplate[] = [];
async function loadGalleryTemplates() {
  const galleries: string[] = await config.get("playgrounds.templateGalleries");

  let templates: GalleryTemplate[] = [];
  for (let gallery of galleries) {
    if (KnownGalleries.has(gallery)) {
      gallery = KnownGalleries.get(gallery)!;
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

const NO_TEMPLATE_GIST_ITEM = {
  label: "$(arrow-right) Continue without a template",
  alwaysShow: true,
  description: "Create a playground based on your configured GistPad settings"
};

async function newPlaygroundWithoutTemplate(
  isPublic: boolean = true,
  openAsWorkspace: boolean = false
) {
  const description = await vscode.window.showInputBox({
    prompt: "Enter the description of the playground"
  });

  if (!description) {
    return;
  }

  const gist: Gist = await withProgress("Creating Playground...", async () =>
    newGist(await generateNewPlaygroundFiles(), isPublic, description, false)
  );

  if (openAsWorkspace) {
    openGistAsWorkspace(gist.id);
  } else {
    openPlayground(gist);
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

  const templates = [...galleryTemplates];
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
    return await newPlaygroundWithoutTemplate(isPublic, openAsWorkspace);
  }

  quickPick.items = [
    ...templates.sort((a, b) => a.label.localeCompare(b.label)),
    NO_TEMPLATE_GIST_ITEM
  ];

  quickPick.show();

  quickPick.onDidAccept(async () => {
    quickPick.hide();

    const template = quickPick.selectedItems[0];
    switch (template.label) {
      case NO_TEMPLATE_GIST_ITEM.label: {
        await newPlaygroundWithoutTemplate(isPublic, openAsWorkspace);
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
  console.log(JSON.stringify(gist, null, 2));
  const renderHtml = new RenderPlaygroundHtml(gist, webviewControlScript);
  const { markupFile, stylesheetFile, scriptFile } = renderHtml;

  const includedFiles = [!!markupFile, !!stylesheetFile, !!scriptFile].filter(
    (file) => file
  ).length;

  const manifestContent = getManifestContent(gist);
  let manifest: IPlaygroundManifest;
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

  const htmlView = new PlaygroundWebview(
    webViewPanel.webview,
    output,
    gist,
    renderHtml
  );

  if (config.get("playgrounds.showConsole") || manifest.showConsole) {
    output.show(false);
  }

  const autoRun = config.get("playgrounds.autoRun");
  const runOnEdit = autoRun === "onEdit";

  const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(
    debounce(async ({ document }) => {
      if (isPlaygroundDocument(gist, document, PlaygroundFileType.markup)) {
        htmlView.updateHTML(document, runOnEdit);
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

            htmlView.updateManifest(getManifestContent(gist), runOnEdit);
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
        htmlView.updateCSS(document, runOnEdit);
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

  store.activeGist = gist.id;

  await vscode.commands.executeCommand(
    "setContext",
    "gistpad:activeGist",
    true
  );

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
    vscode.commands.executeCommand("setContext", "gistpad:activeGist", false);
    store.activeGist = null;
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

  // Pre-cache the CDNJS, template galleries,
  // and user templates, as soon as the user
  // has logged in and their gists have been loaded.
  reaction(
    () => [store.isSignedIn, store.isLoading],
    ([isSignedIn, isLoading]) => {
      if (isSignedIn && !isLoading) {
        getCDNJSLibraries();
        loadGalleryTemplates();
        loadPlaygroundManifests();
      }
    }
  );

  // Reload the template galleries whenever the user changes
  // them, that way, the list is always accurate.
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("gistpad.playgrounds.templateGalleries")) {
      loadGalleryTemplates();
    }
  });
}
