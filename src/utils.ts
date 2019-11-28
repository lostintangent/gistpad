import * as path from "path";
import { Uri, workspace, commands, window, ViewColumn } from "vscode";
import { FS_SCHEME } from "./constants";
import { Gist, getGist } from "./api";

export function getGistDetailsFromUri(uri: Uri) {
	return {
	  gistId: uri.authority,
	  file: decodeURIComponent(path.basename(uri.toString()))
	};
}
  
export function getGistWorkspaceId() {
	return workspace.workspaceFolders![0].uri.authority
}

export function isGistWorkspace() {
	return workspace.workspaceFolders &&
		workspace.workspaceFolders[0].uri.scheme === FS_SCHEME;
}

export async function openGist(id: string, isNew: boolean = false) {
	const { files } = await getGist(id);

	Object.entries(files).reverse().forEach(async ([_, file], index) => {
		const uri = Uri.parse(`${FS_SCHEME}://${id}/${file.filename}`);

		if (!isNew && path.extname(file.filename!) === ".md") {
			commands.executeCommand("markdown.showPreview", uri);
		} else {
			// TODO: Improve the view column arrangement for more than 2 files
			await window.showTextDocument(uri, { preview: false, viewColumn: ViewColumn.Beside });
		}
	});
}

export function openGistAsWorkspace(id: string) {
	// TODO: Add support for adding the Gist as a new
	// root to an existing workspace
	const uri = Uri.parse(`${FS_SCHEME}://${id}/`);
	commands.executeCommand("vscode.openFolder", uri, false);
}

export function uriToFileName(uri: Uri): string {
    return decodeURIComponent(path.basename(uri.toString()));
}

export function fileNameToUri(gistId: string, filename: string): Uri {
    return Uri.parse(`${FS_SCHEME}://${gistId}/${filename}`);
}

export function getGistLabel(gist: Gist) {
	const suffix = gist.public ? "" : " 🔒"
	return `${Object.keys(gist.files)[0]}${suffix}`
}

export function getStarredGistLabel(gist: Gist) {
	const suffix = gist.public ? "" : " 🔒"
	return `${gist.owner.login} / ${Object.keys(gist.files)[0]}${suffix}`
}