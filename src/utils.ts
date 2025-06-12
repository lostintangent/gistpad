import * as moment from "moment";
import * as path from "path";
import {
  commands,
  ExtensionContext,
  extensions,
  ProgressLocation,
  TextDocument,
  Uri,
  ViewColumn,
  window,
  workspace
} from "vscode";
import {
  DIRECTORY_SEPARATOR,
  ENCODED_DIRECTORY_SEPARATOR,
  FS_SCHEME,
  INPUT_SCHEME,
  SWING_FILE
} from "./constants";
import { Gist, SortOrder, store } from "./store";
import { getGist } from "./store/actions";
import { isCodeTourInstalled, startTourFromFile, TOUR_FILE } from "./tour";

export function byteArrayToString(value: Uint8Array) {
  return new TextDecoder().decode(value);
}

export function isOwnedGist(gistId: string): boolean {
  return (
    store.isSignedIn &&
    (!!store.gists.find((gist) => gist.id === gistId) ||
      !!store.archivedGists?.find((gist) => gist.id === gistId) ||
      (store.dailyNotes.gist ? store.dailyNotes.gist.id === gistId : false))
  );
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

  if (isSwingGist(gist)) {
    //TODO closeWebviewPanel(gist.id);
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

    if (isArchivedGist(gist)) {
      description = description.replace(/ \[Archived\]$/, "");
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
    workspace.workspaceFolders.length > 0 &&
    workspace.workspaceFolders[0].uri.scheme === FS_SCHEME
  );
}

export async function openGist(
  id: string,
  openAsWorkspace: boolean,
  forceNewWindow?: boolean
) {
  if (openAsWorkspace) {
    return openGistAsWorkspace(id, !!forceNewWindow);
  }

  return openGistFiles(id);
}

export function openGistAsWorkspace(id: string, forceNewWindow: boolean) {
  // TODO: Add support for adding the Gist as a new
  // root to an existing workspace
  const uri = Uri.parse(`${FS_SCHEME}://${id}/`);
  commands.executeCommand("vscode.openFolder", uri, {
    forceNewWindow,
    noRecentEntry: true
  });
}

export async function openGistFiles(id: string) {
  try {
    const gist =
      store.gists.find((gist) => gist.id === id) ||
      store.archivedGists.find((gist) => gist.id === id) ||
      store.starredGists.find((gist) => gist.id === id) ||
      (await getGist(id));

    if (
      isSwingGist(gist) &&
      extensions.getExtension("codespaces-contrib.codeswing")
    ) {
      // TODO: Cleanup this code
      const extension = extensions.getExtension("codespaces-contrib.codeswing");

      if (extension!.isActive) {
        await extension?.activate();
      }

      const uri = Uri.parse(`${FS_SCHEME}://${id}/`);
      extension?.exports.openSwing(uri);
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
  commands.executeCommand("vscode.open", uri, {
    preview: true,
    viewColumn: ViewColumn.Active
  });
}

export function encodeDirectoryName(filename: string) {
  return filename.replace(DIRECTORY_SEPARATOR, ENCODED_DIRECTORY_SEPARATOR);
}

export function decodeDirectoryName(filename: string) {
  return filename.replace(ENCODED_DIRECTORY_SEPARATOR, DIRECTORY_SEPARATOR);
}

export function encodeDirectoryUri(uri: Uri) {
  if (uri.path.substr(1).includes(DIRECTORY_SEPARATOR)) {
    return uri.with({
      path: `${DIRECTORY_SEPARATOR}${uri.path
        .substr(1)
        .replace(DIRECTORY_SEPARATOR, ENCODED_DIRECTORY_SEPARATOR)}`
    });
  }
  return uri;
}

export function sanitizeDirectoryName(name: string): string {
  // Remove invalid characters for directory names
  // Replace spaces and special characters with hyphens
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove invalid filesystem characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^\w\-\.]/g, '') // Keep only word characters, hyphens, and dots
    .replace(/--+/g, '-') // Replace multiple consecutive hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100) // Limit length to 100 characters
    || 'gist'; // Fallback if name becomes empty
}

export function decodeDirectoryUri(uri: Uri) {
  if (uri.path.includes(ENCODED_DIRECTORY_SEPARATOR)) {
    return uri.with({
      path: uri.path.replace(ENCODED_DIRECTORY_SEPARATOR, DIRECTORY_SEPARATOR)
    });
  }
  return uri;
}

export function fileNameToUri(gistId: string, filename: string = ""): Uri {
  return Uri.parse(`${FS_SCHEME}://${gistId}/${encodeURIComponent(filename)}`);
}

export function getGistDetailsFromUri(uri: Uri) {
  const pathWithoutPrefix = uri.path.substr(1);
  const directory = pathWithoutPrefix.includes(DIRECTORY_SEPARATOR)
    ? pathWithoutPrefix.split(DIRECTORY_SEPARATOR)[0]
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
    if (isSwingTemplateGist(gist)) {
      gist.type = "code-swing-template";
    } else if (isTutorialGist(gist)) {
      gist.type = "code-swing-tutorial";
    } else if (isSwingGist(gist)) {
      gist.type = "code-swing";
    } else if (isNotebookGist(gist)) {
      gist.type = "notebook";
    } else if (isNoteGist(gist)) {
      gist.type = "note";
    } else if (isTourGist(gist)) {
      gist.type = "code-tour";
    } else if (isDiagramGist(gist)) {
      gist.type = "diagram";
    } else if (isFlashCodeGist(gist)) {
      gist.type = "flash-code";
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

const IMAGE_EXTENSIONS = [".png", ".tldraw"];
const METADATA_EXTENSIONS = [".yml", ".json"];
const DOCUMENT_EXTENSIONS = [".adoc", ".md", ".markdown", ".txt"];
const ALL_DOCUMENT_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...METADATA_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS
];

export function isNoteGist(gist: Gist) {
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

export function isDiagramGist(gist: Gist) {
  return Object.keys(gist.files).some((file) => file.includes(".drawio"));
}

export function isFlashCodeGist(gist: Gist) {
  return Object.keys(gist.files).some((file) => file.includes(".deck"));
}

export function isSwingGist(gist: Gist) {
  const gistFiles = Object.keys(gist.files);

  // TODO: Replace this with a CodeSwing API

  return (
    gistFiles.includes(SWING_FILE) ||
    gistFiles.some((file) => ["index.html", "index.pug"].includes(file)) ||
    gistFiles.includes("scripts") ||
    (gistFiles.includes("script.js") &&
      gistFiles.some((file) => path.extname(file) === ".markdown"))
  );
}

export function isSwingTemplateGist(gist: Gist) {
  const swingManifest = gist.files[SWING_FILE];

  if (!swingManifest) {
    return false;
  }

  try {
    const content = JSON.parse(swingManifest.content || "{}");
    if (content.template) {
      return true;
    }
  } catch {
    return false;
  }
}

export function isTutorialGist(gist: Gist) {
  const swingManifest = gist.files[SWING_FILE];

  if (!swingManifest) {
    return false;
  }

  try {
    const content = JSON.parse(swingManifest.content || "{}");
    return content.tutorial;
  } catch {
    return false;
  }
}

export function joinPath(context: ExtensionContext, fragment: string) {
  let uri: string | Uri;

  // @ts-ignore
  if (context.extensionUri) {
    // @ts-ignore
    uri = Uri.joinPath(context.extensionUri, fragment);
  } else {
    uri = path.join(context.extensionPath, fragment);
  }

  return uri;
}

export function getIconPath(context: ExtensionContext, iconName: string) {
  return {
    dark: joinPath(context, `images/dark/${iconName}`) as Uri,
    light: joinPath(context, `images/light/${iconName}`) as Uri
  };
}

export function isArchivedGist(gist: Gist): boolean {
  return !!gist.description?.endsWith(" [Archived]");
}

export function getUrlFileNameHash(fileName: string): string {
  return `#file-${fileName.replace(/[^a-zA-Z0-9]/g, "-").toLocaleLowerCase()}`;
}
