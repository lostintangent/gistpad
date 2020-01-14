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
import { FS_SCHEME, PLAYGROUND_FILE } from "./constants";
import { Gist, SortOrder, store } from "./store";
import { getGist } from "./store/actions";

export function byteArrayToString(value: Uint8Array) {
  return new TextDecoder().decode(value);
}

export function isOwnedGist(gistId: string): boolean {
  return !!store.gists.find((gist) => gist.id === gistId);
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
      editor.document.uri.scheme === FS_SCHEME &&
      editor.document.uri.authority === gist.id
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

export function getGistLabel(gist: Gist): string {
  return gist.description || `${Object.keys(gist.files)[0]}`;
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

export function isNotebookGist(gist: Gist) {
  return Object.keys(gist.files).some((file) => file.endsWith("ipynb"));
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
    (gistFiles.includes("scripts") &&
      gistFiles.some((file) => path.extname(file) === ".markdown"))
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
    const gist = await getGist(id);

    if (isPlaygroundGist(gist)) {
      await openPlayground(gist);
    } else {
      Object.entries(gist.files)
        .reverse()
        .forEach(async ([_, file], index) => {
          const uri = fileNameToUri(id, file.filename!);

          //if (!isNew && path.extname(file.filename!) === ".md") {
          //  commands.executeCommand("markdown.showPreview", uri);
          //} else {
          // TODO: Improve the view column arrangement for more than 2 files
          await window.showTextDocument(uri, {
            preview: false,
            viewColumn: ViewColumn.Beside
          });
          //}
        });
    }
  } catch (e) {
    window.showErrorMessage(
      `The specified gist doesn't exist: "${id}". Please check the spelling and try again.`
    );
  }
}

export async function openGistFile(uri: Uri, allowPreview: boolean = true) {
  const extension = path
    .extname(uri.toString())
    .toLocaleLowerCase()
    .substr(1);

  let commandName = "vscode.open";

  if (allowPreview) {
    switch (extension) {
      case "md":
        commandName = "markdown.showPreview";
        break;
      //case "ipynb":
      //  commandName = "python.datascience.opennotebook";
      //  break;
    }
  }

  commands.executeCommand(commandName, uri);
}

export function fileNameToUri(gistId: string, filename: string): Uri {
  return Uri.parse(`${FS_SCHEME}://${gistId}/${encodeURIComponent(filename)}`);
}

export function getGistDetailsFromUri(uri: Uri) {
  return {
    gistId: uri.authority,
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

export function stringToByteArray(value: string) {
  return new TextEncoder().encode(value);
}

export function uriToFileName(uri: Uri): string {
  return decodeURIComponent(path.basename(uri.toString()));
}

export const isBlogPostGist = (gist: Gist) => {
  for (let [fileName] of Object.entries(gist.files)) {
    if (fileName === "gistlog.yml") {
      return true;
    }
  }
};
