import * as path from "path";
import { Uri, workspace, commands } from "vscode";
import { FS_SCHEME } from "./constants";

export function getGistDetailsFromUri(uri: Uri) {
	return {
	  gistId: uri.authority,
	  file: path.basename(uri.toString())
	};
}
  
export function getGistWorkspaceId() {
	return workspace.workspaceFolders![0].uri.authority
}

export function isGistWorkspace() {
	return workspace.workspaceFolders &&
		workspace.workspaceFolders[0].uri.scheme === FS_SCHEME;
}

export function openGist(id: string) {
	const uri = Uri.parse(`${FS_SCHEME}://${id}/`);
	commands.executeCommand("vscode.openFolder", uri, false);
}

export function uriToFileName(uri: Uri): string {
    return decodeURIComponent(path.basename(uri.toString()));
}