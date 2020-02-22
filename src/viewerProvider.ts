import * as path from "path";
import * as vscode from "vscode";

const CONTRIBUTION_NAME = "gistpad.viewers";

interface GistPadViewer {
  filenames?: string[];
  extensions?: string;
  command: string;
}

let viewers: GistPadViewer[] = [];

export function getViewerCommand(uri: vscode.Uri): string | undefined {
  let match = viewers.find((viewer) =>
    viewer.filenames?.includes(path.basename(uri.path).toLocaleLowerCase())
  );

  if (!match) {
    match = viewers.find((viewer) =>
      viewer.extensions?.includes(path.extname(uri.path).toLocaleLowerCase())
    );
  }

  return match ? match.command : undefined;
}

function discoverViewers() {
  viewers = vscode.extensions.all.flatMap((e) => {
    return e.packageJSON.contributes &&
      e.packageJSON.contributes[CONTRIBUTION_NAME]
      ? e.packageJSON.contributes[CONTRIBUTION_NAME]
      : [];
  });
}

vscode.extensions.onDidChange(discoverViewers);
discoverViewers();
