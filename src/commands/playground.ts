import { debounce } from "debounce";
import { reaction } from "mobx";
import * as path from "path";
import * as vscode from "vscode";
import * as config from "../config";
import {
  DIRECTORY_SEPARATOR,
  ENCODED_DIRECTORY_SEPARATOR,
  EXTENSION_NAME,
  FS_SCHEME,
  INPUT_SCHEME,
  PLAYGROUND_FILE
} from "../constants";
import { getFileContents } from "../fileSystem/api";
import { enableGalleries, loadGalleries } from "../playgrounds/galleryProvider";
import { discoverLanguageProviders } from "../playgrounds/languages/languageProvider";
import {
  getMarkupContent,
  getMarkupExtensions,
  getNewMarkupFilename,
  MARKUP_BASE_NAME
} from "../playgrounds/languages/markup";
import {
  getReadmeContent,
  README_BASE_NAME,
  README_EXTENSIONS
} from "../playgrounds/languages/readme";
import {
  getNewScriptFileName,
  includesReactFiles,
  includesReactScripts,
  isReactFile,
  REACT_SCRIPTS,
  SCRIPT_BASE_NAME,
  SCRIPT_EXTENSIONS
} from "../playgrounds/languages/script";
import {
  getNewStylesheetFilename,
  getStylesheetContent,
  STYLESHEET_BASE_NAME,
  STYLESHEET_EXTENSIONS
} from "../playgrounds/languages/stylesheet";
import {
  createLayoutManager,
  PlaygroundLayout
} from "../playgrounds/layoutManager";
import { PlaygroundWebview } from "../playgrounds/webview";
import { Gist, GistFile, store } from "../store";
import { duplicateGist, newGist } from "../store/actions";
import { storage } from "../store/storage";
import {
  endCurrentTour,
  isCodeTourInstalled,
  startTourFromFile,
  TOUR_FILE
} from "../tour";
import { GistNode, GistsNode } from "../tree/nodes";
import {
  byteArrayToString,
  closeGistFiles,
  decodeDirectoryName,
  decodeDirectoryUri,
  fileNameToUri,
  getGistDescription,
  getGistLabel,
  hasTempGist,
  isOwnedGist,
  openGistAsWorkspace,
  stringToByteArray,
  updateGistTags,
  withProgress
} from "../utils";
import { addPlaygroundLibraryCommand } from "./addPlaygroundLibraryCommand";
import { getCDNJSLibraries } from "./cdnjs";

export type ScriptType = "text/javascript" | "module";
export type ReadmeBehavior =
  | "none"
  | "inputComment"
  | "previewHeader"
  | "previewFooter";

const CONFIG_FILE = "config.json";
const CANVAS_FILE = "canvas.html";

export interface PlaygroundInput {
  fileName?: string;
  prompt?: string;
  completionMessage?: string;
}

export interface PlaygroundManifest {
  scripts?: string[];
  styles?: string[];
  layout?: string;
  showConsole?: boolean;
  template?: boolean;
  scriptType?: ScriptType;
  readmeBehavior?: ReadmeBehavior;
  tutorial?: string;
  input?: PlaygroundInput;
}

export enum PlaygroundLibraryType {
  script = "scripts",
  style = "styles"
}

export enum PlaygroundFileType {
  config,
  markup,
  script,
  stylesheet,
  manifest,
  readme,
  tour
}

export const DEFAULT_MANIFEST = {
  scripts: [] as string[],
  styles: [] as string[]
};

interface IPlayground {
  gist: Gist;
  webView: PlaygroundWebview;
  webViewPanel: vscode.WebviewPanel;
  console: vscode.OutputChannel;
  hasTour: boolean;
  commentController?: vscode.CommentController;
}

export let activePlayground: IPlayground | null;

export function setActivePlaygroundHasTour() {
  if (activePlayground) {
    activePlayground.hasTour = true;
  }
}

export async function closeWebviewPanel(gistId: string) {
  if (activePlayground && activePlayground.gist.id === gistId) {
    activePlayground.webViewPanel.dispose();
  }
}

export const getCanvasContent = async (gist: Gist) => {
  if (!gist.files[CANVAS_FILE]) {
    return "";
  }

  return await getFileContents(gist.files[CANVAS_FILE]);
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

async function generateNewPlaygroundFiles(): Promise<GistFile[]> {
  const manifest = {
    ...DEFAULT_MANIFEST
  };

  const files = [];

  if (await config.get("playgrounds.includeScript")) {
    const scriptFileName = await getNewScriptFileName();

    files.push({
      filename: scriptFileName
    });

    if (isReactFile(scriptFileName)) {
      manifest.scripts.push(...REACT_SCRIPTS);
    }
  }

  if (config.get("playgrounds.includeStylesheet")) {
    const stylesheetFileName = await getNewStylesheetFilename();

    files.push({
      filename: stylesheetFileName
    });
  }

  if (config.get("playgrounds.includeMarkup")) {
    const markupFileName = await getNewMarkupFilename();

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

function loadPlaygroundManifests() {
  store.gists.concat(store.starredGists).forEach(async (gist) => {
    const manifest = gist.files[PLAYGROUND_FILE];
    if (manifest) {
      await vscode.workspace.fs.readFile(
        fileNameToUri(gist.id, PLAYGROUND_FILE)
      );

      updateGistTags(gist);
    }
  });
}

export const getGistFileOfType = (
  gist: Gist,
  fileType: PlaygroundFileType,
  currentTutorialStep?: number
) => {
  let extensions: string[];
  let fileBaseName: string;
  switch (fileType) {
    case PlaygroundFileType.markup:
      extensions = getMarkupExtensions();
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
    case PlaygroundFileType.manifest:
      extensions = [""];
      fileBaseName = PLAYGROUND_FILE;
      break;
    case PlaygroundFileType.tour:
      extensions = [""];
      fileBaseName = TOUR_FILE;
      break;
    case PlaygroundFileType.config:
      extensions = [""];
      fileBaseName = CONFIG_FILE;
      break;
    case PlaygroundFileType.stylesheet:
    default:
      extensions = STYLESHEET_EXTENSIONS;
      fileBaseName = STYLESHEET_BASE_NAME;
      break;
  }

  const prefix = currentTutorialStep
    ? `#?${currentTutorialStep}[^\/]*${ENCODED_DIRECTORY_SEPARATOR}`
    : "";

  const fileCandidates = extensions.map(
    (extension) => new RegExp(`${prefix}${fileBaseName}${extension}`)
  );

  return Object.keys(gist.files).find((file) =>
    fileCandidates.find((candidate) => candidate.test(file))
  );
};

function isPlaygroundDocument(
  gist: Gist,
  document: vscode.TextDocument,
  fileType: PlaygroundFileType,
  currentTutorialStep?: number
) {
  if (gist.id !== document.uri.authority) {
    return false;
  }

  let extensions: string[];
  let fileBaseName: string;
  switch (fileType) {
    case PlaygroundFileType.markup:
      extensions = getMarkupExtensions();
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
    case PlaygroundFileType.manifest:
      extensions = [""];
      fileBaseName = PLAYGROUND_FILE;
      break;
    case PlaygroundFileType.config:
      extensions = [""];
      fileBaseName = CONFIG_FILE;
      break;
    case PlaygroundFileType.stylesheet:
    default:
      extensions = STYLESHEET_EXTENSIONS;
      fileBaseName = STYLESHEET_BASE_NAME;
      break;
  }

  const prefix = currentTutorialStep
    ? `${DIRECTORY_SEPARATOR}#?${currentTutorialStep}[^\/]*${DIRECTORY_SEPARATOR}`
    : DIRECTORY_SEPARATOR;

  const fileCandidates = extensions.map(
    (extension) => new RegExp(`${prefix}${fileBaseName}${extension}`)
  );

  return fileCandidates.find((candidate) => candidate.test(document.uri.path));
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

const TUTORIAL_STEP_PATTERN = /^#?(?<step>\d+)[^\/]*---/;
export async function openPlayground(gist: Gist) {
  const manifestContent = await getManifestContent(gist);
  let manifest: PlaygroundManifest;
  try {
    manifest = JSON.parse(manifestContent);
  } catch (e) {
    manifest = {};
  }

  let currentTutorialStep: number | undefined;
  let totalTutorialSteps: number | undefined;

  if (manifest.tutorial) {
    currentTutorialStep = storage.currentTutorialStep(gist.id);
    const files = Object.keys(gist.files).filter((file) =>
      file.match(TUTORIAL_STEP_PATTERN)
    );
    totalTutorialSteps = files.reduce((maxStep, fileName) => {
      const step = Number(TUTORIAL_STEP_PATTERN.exec(fileName)!.groups!.step);

      if (step > maxStep) {
        return step;
      } else {
        return maxStep;
      }
    }, 0);

    const stepManifestFile = getGistFileOfType(
      gist,
      PlaygroundFileType.manifest,
      currentTutorialStep
    );

    if (stepManifestFile) {
      const stepManifest = byteArrayToString(
        await vscode.workspace.fs.readFile(
          fileNameToUri(gist.id, stepManifestFile)
        )
      );
      manifest = {
        ...manifest,
        ...JSON.parse(stepManifest)
      };
    }
  }

  const markupFile = getGistFileOfType(
    gist,
    PlaygroundFileType.markup,
    currentTutorialStep
  );

  const stylesheetFile = getGistFileOfType(
    gist,
    PlaygroundFileType.stylesheet,
    currentTutorialStep
  );

  const scriptFile = getGistFileOfType(
    gist,
    PlaygroundFileType.script,
    currentTutorialStep
  );

  const readmeFile = getGistFileOfType(
    gist,
    PlaygroundFileType.readme,
    currentTutorialStep
  );

  const configFile = getGistFileOfType(
    gist,
    PlaygroundFileType.config,
    currentTutorialStep
  );

  const inputFile =
    manifest.input && manifest.input.fileName
      ? `${INPUT_SCHEME}:///${manifest.input.fileName}`
      : "";

  const includedFiles = [
    !!markupFile,
    !!stylesheetFile,
    !!scriptFile,
    !!inputFile
  ].filter((file) => file).length;

  const layoutManager = await createLayoutManager(
    includedFiles,
    manifest.layout
  );

  let htmlDocument: vscode.TextDocument;
  if (markupFile) {
    htmlDocument = await vscode.workspace.openTextDocument(
      decodeDirectoryUri(fileNameToUri(gist.id, markupFile))
    );

    layoutManager.showDocument(htmlDocument, false);
  }

  let cssDocument: vscode.TextDocument;
  if (stylesheetFile) {
    cssDocument = await vscode.workspace.openTextDocument(
      decodeDirectoryUri(fileNameToUri(gist.id, stylesheetFile))
    );

    layoutManager.showDocument(cssDocument);
  }

  let jsDocument: vscode.TextDocument;
  if (scriptFile) {
    jsDocument = await vscode.workspace.openTextDocument(
      decodeDirectoryUri(fileNameToUri(gist.id, scriptFile!))
    );

    layoutManager.showDocument(jsDocument);
  }

  let inputDocument: vscode.TextDocument;
  if (inputFile) {
    // Clear any previous content from the input file.
    await vscode.workspace.fs.writeFile(
      vscode.Uri.parse(inputFile),
      stringToByteArray("")
    );

    inputDocument = await vscode.workspace.openTextDocument(
      vscode.Uri.parse(inputFile)
    );

    const editor = await layoutManager.showDocument(inputDocument, false);

    const prompt = manifest.input!.prompt;
    if (prompt) {
      const decoration = vscode.window.createTextEditorDecorationType({
        after: {
          contentText: prompt,
          margin: "0 0 0 30px",
          fontStyle: "italic",
          color: new vscode.ThemeColor("editorLineNumber.foreground")
        },
        isWholeLine: true
      });

      editor?.setDecorations(decoration, [new vscode.Range(0, 0, 0, 1000)]);
    }

    // Continuously save this file so that it doesn't ask
    // the user to save it upon closing
    const interval = setInterval(() => {
      if (inputDocument) {
        inputDocument.save();
      } else {
        clearInterval(interval);
      }
    }, 100);
  }

  const webViewPanel = vscode.window.createWebviewPanel(
    "gistpad.playgroundPreview",
    "Preview",
    { viewColumn: layoutManager.previewViewColumn, preserveFocus: true },
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
    styles,
    totalTutorialSteps,
    manifest.tutorial
  );

  if (config.get("playgrounds.showConsole") || manifest.showConsole) {
    output.show(false);
  }

  const autoRun = config.get("playgrounds.autoRun");
  const runOnEdit = autoRun === "onEdit";

  function processReadme(rawContent: string, runOnEdit: boolean = false) {
    // @ts-ignore
    if (manifest.readmeBehavior === "inputComment" && inputDocument) {
      if (activePlayground!.commentController) {
        activePlayground!.commentController.dispose();
      }

      activePlayground!.commentController = vscode.comments.createCommentController(
        EXTENSION_NAME,
        EXTENSION_NAME
      );

      const thread = activePlayground!.commentController.createCommentThread(
        inputDocument.uri,
        new vscode.Range(0, 0, 0, 0),
        [
          {
            author: {
              name: "GistPad",
              iconPath: vscode.Uri.parse(
                "https://cdn.jsdelivr.net/gh/vsls-contrib/gistpad/images/icon.png"
              )
            },
            body: rawContent,
            mode: vscode.CommentMode.Preview,
            label: gist.description
          }
        ]
      );

      // @ts-ignore
      thread.canReply = false;
      thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    } else {
      const htmlContent = getReadmeContent(rawContent);
      htmlView.updateReadme(htmlContent || "", runOnEdit);
    }
  }

  const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(
    debounce(async ({ document }) => {
      if (
        isPlaygroundDocument(
          gist,
          document,
          PlaygroundFileType.markup,
          currentTutorialStep
        )
      ) {
        const content = await getMarkupContent(document);

        if (content !== null) {
          htmlView.updateHTML(content, runOnEdit);
        }
      } else if (
        isPlaygroundDocument(
          gist,
          document,
          PlaygroundFileType.script,
          currentTutorialStep
        )
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
      } else if (
        isPlaygroundDocument(
          gist,
          document,
          PlaygroundFileType.manifest,
          currentTutorialStep
        )
      ) {
        htmlView.updateManifest(document.getText(), runOnEdit);

        if (jsDocument) {
          manifest = JSON.parse(document.getText());

          // TODO: Only update the JS if the manifest change
          // actually impacts it (e.g. adding/removing react)
          htmlView.updateJavaScript(jsDocument, runOnEdit);
        }
      } else if (
        isPlaygroundDocument(
          gist,
          document,
          PlaygroundFileType.stylesheet,
          currentTutorialStep
        )
      ) {
        const content = await getStylesheetContent(document);
        if (content !== null) {
          htmlView.updateCSS(content, runOnEdit);
        }
      } else if (
        isPlaygroundDocument(
          gist,
          document,
          PlaygroundFileType.readme,
          currentTutorialStep
        )
      ) {
        const rawContent = document.getText();
        processReadme(rawContent, runOnEdit);
      } else if (
        isPlaygroundDocument(
          gist,
          document,
          PlaygroundFileType.config,
          currentTutorialStep
        )
      ) {
        htmlView.updateConfig(document.getText(), runOnEdit);
      } else if (document.uri.scheme === INPUT_SCHEME) {
        htmlView.updateInput(document.getText(), runOnEdit);
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

  htmlView.updateManifest(manifest ? JSON.stringify(manifest) : "");

  htmlView.updateHTML(
    !!markupFile
      ? (await getMarkupContent(htmlDocument!)) || ""
      : await getCanvasContent(gist)
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
    console: output,
    hasTour: false
  };

  if (readmeFile) {
    const rawContent = byteArrayToString(
      await vscode.workspace.fs.readFile(fileNameToUri(gist.id, readmeFile))
    );

    processReadme(rawContent);
  }

  if (configFile) {
    const content = byteArrayToString(
      await vscode.workspace.fs.readFile(fileNameToUri(gist.id, configFile))
    );

    htmlView.updateConfig(content || "");
  }

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

    if (activePlayground?.hasTour) {
      endCurrentTour();
      vscode.commands.executeCommand(
        "setContext",
        "gistpad:allowCodeTourRecording",
        false
      );
    }

    if (activePlayground?.commentController) {
      activePlayground.commentController.dispose();
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

  if (await isCodeTourInstalled()) {
    const tourFileName = getGistFileOfType(
      gist,
      PlaygroundFileType.tour,
      currentTutorialStep
    );

    const canEdit = isOwnedGist(gist.id);

    if (tourFileName) {
      activePlayground!.hasTour = true;

      const suffix = manifest.tutorial
        ? `/${path.dirname(decodeDirectoryName(tourFileName))}`
        : "";
      const workspaceRoot = vscode.Uri.parse(
        `${FS_SCHEME}://${gist.id}${suffix}`
      );

      const tourFile = gist.files[tourFileName];
      startTourFromFile(tourFile, workspaceRoot, false, canEdit);
    }

    if (canEdit) {
      await vscode.commands.executeCommand(
        "setContext",
        "gistpad:allowCodeTourRecording",
        true
      );
    }
  }
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
        discoverLanguageProviders();
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
