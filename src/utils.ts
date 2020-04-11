import * as moment from "moment";
import * as path from "path";
import {
  commands,
  ProgressLocation,
  TextDocument,
  Uri,
  ViewColumn,
  window,
  workspace
} from "vscode";
import { closeWebviewPanel, openPlayground } from "./commands/playground";
import {
  DIRECTORY_SEPERATOR,
  ENCODED_DIRECTORY_SEPERATOR,
  FS_SCHEME,
  INPUT_SCHEME,
  PLAYGROUND_FILE,
  TEMP_GIST_ID
} from "./constants";
import {
  isCodeTourInstalled,
  startTourFromFile,
  TOUR_FILE
} from "./playgrounds/tour";
import { Gist, SortOrder, store, Store } from "./store";
import { getGist } from "./store/actions";
import { getViewerCommand } from "./viewerProvider";

export function byteArrayToString(value: Uint8Array) {
  return new TextDecoder().decode(value);
}

export function isOwnedGist(gistId: string): boolean {
  return (
    store.isSignedIn &&
    (!!store.gists.find((gist) => gist.id === gistId) ||
      (store.scratchNotes.gist ? store.scratchNotes.gist.id === gistId : false))
  );
}

export function isTempGistId(gistId: string): boolean {
  return gistId === TEMP_GIST_ID;
}

export function isTempGistUri(uri: Uri): boolean {
  const { gistId } = getGistDetailsFromUri(uri);
  return isTempGistId(gistId);
}

export function hasTempGist(store: Store): boolean {
  return !!store.gists.find((gist) => isTempGistId(gist.id));
}

export async function showGistQuickPick(gists: Gist[], placeHolder: string) {
  const items = gists.map((gist) => {
    return {
      label: getGistLabel(gist),
      description: getGistDescription(gist),
      id: gist.id
    };
  });

  return window.showQuickPick(items, {
    placeHolder
  });
}

export async function closeGistFiles(gist: Gist) {
  window.visibleTextEditors.forEach((editor) => {
    if (
      (editor.document.uri.scheme === FS_SCHEME &&
        editor.document.uri.authority === gist.id) ||
      editor.document.uri.scheme === INPUT_SCHEME
    ) {
      editor.hide();
    }
  });

  if (isPlaygroundGist(gist)) {
    closeWebviewPanel(gist.id);
  }
}

export function getGistDescription(
  gist: Gist,
  includeType: boolean = true
): string {
  const maybeSuffix = gist.public ? "" : " (Secret)";
  const suffix = includeType ? maybeSuffix : "";

  return `${moment(gist.updated_at).calendar()}${suffix}`;
}

export function withProgress<T>(title: string, action: () => Promise<T>) {
  return window.withProgress(
    {
      location: ProgressLocation.Notification,
      title
    },
    action
  );
}

export function getGistLabel(gist: Gist, stripTags: boolean = false): string {
  if (gist.description) {
    let description = gist.description;

    if (stripTags && gist.tags) {
      gist.tags?.forEach(
        (tag) => (description = description.replace(`#${tag}`, ""))
      );
    }

    return description;
  }

  return `${Object.keys(gist.files)[0]}`;
}

export function getGistWorkspaceId() {
  return workspace.workspaceFolders![0].uri.authority;
}

export function isGistDocument(document: TextDocument) {
  return document.uri.scheme === FS_SCHEME;
}

export function isGistWorkspace() {
  return (
    workspace.workspaceFolders &&
    workspace.workspaceFolders[0].uri.scheme === FS_SCHEME
  );
}

export async function openGist(id: string, openAsWorkspace: boolean) {
  if (openAsWorkspace) {
    return openGistAsWorkspace(id);
  }

  return openGistFiles(id);
}

export function openGistAsWorkspace(id: string) {
  // TODO: Add support for adding the Gist as a new
  // root to an existing workspace
  const uri = Uri.parse(`${FS_SCHEME}://${id}/`);
  commands.executeCommand("vscode.openFolder", uri, false);
}

export async function openGistFiles(id: string) {
  try {
    const gist =
      store.gists.find((gist) => gist.id === id) ||
      store.starredGists.find((gist) => gist.id === id) ||
      (await getGist(id));

    if (isPlaygroundGist(gist)) {
      await openPlayground(gist);
    } else if (isTourGist(gist) && (await isCodeTourInstalled())) {
      const canEdit = isOwnedGist(gist.id);
      const tourFile = gist.files[TOUR_FILE];
      startTourFromFile(tourFile, Uri.parse(""), false, canEdit);
    } else {
      Object.entries(gist.files)
        .reverse()
        .forEach(async ([_, file], index) => {
          const uri = decodeDirectoryUri(fileNameToUri(id, file.filename!));
          openGistFile(uri);
        });
    }
  } catch (e) {
    window.showErrorMessage(
      `The specified gist doesn't exist: "${id}". Please check the spelling and try again.`
    );
  }
}

export async function openGistFile(uri: Uri, allowPreview: boolean = true) {
  const commandName = getViewerCommand(uri) || "vscode.open";
  commands.executeCommand(commandName, uri, {
    preview: true,
    viewColumn: ViewColumn.Active
  });
}

export function encodeDirectoryName(filename: string) {
  return filename.replace(DIRECTORY_SEPERATOR, ENCODED_DIRECTORY_SEPERATOR);
}

export function decodeDirectoryName(filename: string) {
  return filename.replace(ENCODED_DIRECTORY_SEPERATOR, DIRECTORY_SEPERATOR);
}

export function encodeDirectoryUri(uri: Uri) {
  if (uri.path.substr(1).includes(DIRECTORY_SEPERATOR)) {
    return uri.with({
      path: `${DIRECTORY_SEPERATOR}${uri.path
        .substr(1)
        .replace(DIRECTORY_SEPERATOR, ENCODED_DIRECTORY_SEPERATOR)}`
    });
  }
  return uri;
}

export function decodeDirectoryUri(uri: Uri) {
  if (uri.path.includes(ENCODED_DIRECTORY_SEPERATOR)) {
    return uri.with({
      path: uri.path.replace(ENCODED_DIRECTORY_SEPERATOR, DIRECTORY_SEPERATOR)
    });
  }
  return uri;
}

export function fileNameToUri(gistId: string, filename: string = ""): Uri {
  return Uri.parse(`${FS_SCHEME}://${gistId}/${encodeURIComponent(filename)}`);
}

export function getGistDetailsFromUri(uri: Uri) {
  const pathWithoutPrefix = uri.path.substr(1);
  const directory = pathWithoutPrefix.includes(DIRECTORY_SEPERATOR)
    ? pathWithoutPrefix.split(DIRECTORY_SEPERATOR)[0]
    : "";

  return {
    gistId: uri.authority,
    directory: decodeURIComponent(directory),
    file: decodeURIComponent(path.basename(uri.path))
  };
}

export function sortGists(gists: Gist[]) {
  if (store.sortOrder === SortOrder.alphabetical) {
    return gists
      .slice()
      .sort((a, b) => getGistLabel(a).localeCompare(getGistLabel(b)));
  } else {
    return gists
      .slice()
      .sort(
        (a, b) =>
          Date.parse(b.updated_at || b.created_at) -
          Date.parse(a.updated_at || a.created_at)
      );
  }
}

// TODO Convert this into a computed property
// on the gist object itself
const TAG_PATTERN = /\s+#[\w\d-]+\b(?!\s+[^#])/gi;

export function updateGistTags(gist: Gist | Gist[]) {
  const gists = Array.isArray(gist) ? gist : [gist];
  return gists.map((gist) => {
    if (isPlaygroundTemplateGist(gist)) {
      gist.type = "playground-template";
    } else if (isTutorialGist(gist)) {
      gist.type = "tutorial";
    } else if (isPlaygroundGist(gist)) {
      gist.type = "playground";
    } else if (isNotebookGist(gist)) {
      gist.type = "notebook";
    } else if (isDocumentGist(gist)) {
      gist.type = "doc";
    } else if (isTourGist(gist)) {
      gist.type = "tour";
    } else {
      gist.type = "code-snippet";
    }

    const tags = gist.description ? gist.description.match(TAG_PATTERN) : null;
    gist.tags = tags ? tags.map((tag) => tag.trim().substr(1)) : [];

    return gist;
  });
}

export function stringToByteArray(value: string) {
  return new TextEncoder().encode(value);
}

export function uriToFileName(uri: Uri): string {
  return decodeURIComponent(path.basename(uri.toString()));
}

const IMAGE_EXTENSIONS = [".png"];
const METADATA_EXTENSIONS = [".yml", ".json"];
const DOCUMENT_EXTENSIONS = [".adoc", ".md", ".markdown", ".txt"];
const ALL_DOCUMENT_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...METADATA_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS
];

export function isDocumentGist(gist: Gist) {
  const gistFiles = Object.keys(gist.files);

  const includesDocument = gistFiles.some((file) =>
    DOCUMENT_EXTENSIONS.includes(path.extname(file))
  );
  return (
    includesDocument &&
    gistFiles.every((file) =>
      ALL_DOCUMENT_EXTENSIONS.includes(path.extname(file))
    )
  );
}

export function isTourGist(gist: Gist) {
  const files = Object.keys(gist.files);
  return files.length === 1 && files[0] === TOUR_FILE;
}

export function isNotebookGist(gist: Gist) {
  return Object.keys(gist.files).some(
    (file) => path.extname(file) === ".ipynb"
  );
}

export function isPlaygroundGist(gist: Gist) {
  const gistFiles = Object.keys(gist.files);

  // 1) GistPad-native playgrounds
  // 2) CodePen/Bl.ocks.org/etc. playgrounds, which could have just an HTML file or just a script file.
  //    In the case where they only have a script file, it's very likely they'd also have a "scripts"
  //    file, which is hold they'd inject 3rd-party libraries. To make this more reliable, I also
  //    always check for a markdown file, which would alwats exist

  return (
    gistFiles.includes(PLAYGROUND_FILE) ||
    gistFiles.includes("index.html") ||
    gistFiles.includes("index.pug") ||
    gistFiles.includes("index.md") ||
    gistFiles.includes("scripts") ||
    (gistFiles.includes("script.js") &&
      gistFiles.some((file) => path.extname(file) === ".markdown"))
  );
}

export function isPlaygroundTemplateGist(gist: Gist) {
  const playgroundJson = gist.files[PLAYGROUND_FILE];

  if (!playgroundJson) {
    return false;
  }

  try {
    const content = JSON.parse(playgroundJson.content || "{}");
    if (content.template) {
      return true;
    }
  } catch {
    return false;
  }
}

export function isTutorialGist(gist: Gist) {
  const playgroundJson = gist.files[PLAYGROUND_FILE];

  if (!playgroundJson) {
    return false;
  }

  try {
    const content = JSON.parse(playgroundJson.content || "{}");
    return content.tutorial;
  } catch {
    return false;
  }
}
