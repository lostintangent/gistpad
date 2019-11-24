import { commands, env, ExtensionContext, window } from "vscode";
import { deleteGist, forkGist, newGist } from "./api";
import { ensureAuthenticated, signout } from "./auth";
import { EXTENSION_ID } from "./constants";
import { getGistWorkspaceId, isGistWorkspace, openGist } from "./utils";

export function registerCommands(context: ExtensionContext) {
    context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.openGist`, async () => {
		const clipboardValue = await env.clipboard.readText();
		const gistID = await window.showInputBox({
			prompt: "Enter the ID of the Gist you'd like to open",
			value: clipboardValue
		});

		if (gistID) {
			openGist(gistID);
		}
	}));

	const PUBLIC_VISIBILITY = "Public";
	context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.newGist`, async () => {
		await ensureAuthenticated();

		const fileName = await window.showInputBox({
			prompt: "Enter the starting file name",
			value: "foo.txt"
		});
		if (!fileName) return;

		const visibility = await window.showQuickPick([PUBLIC_VISIBILITY, "Secret"], { placeHolder: "Select the new Gist's visibility"});
		if (!visibility) return;
		
		const description = await window.showInputBox({
			prompt: "Enter an optional description for the new Gist",
		});
		
		newGist(fileName, visibility === PUBLIC_VISIBILITY, description);
	}));

	context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.forkGist`, async () => {
		await ensureAuthenticated();

		let gistId;
		if (isGistWorkspace()) {	
			gistId = getGistWorkspaceId();
		} else {
			gistId = await window.showInputBox({ prompt: "Enter the Gist ID to fork" });
			if (!gistId) return;
		}

		forkGist(gistId);
	}));

	const DELETE_RESPONSE = "Delete";
	context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.deleteGist`, async () => {
		await ensureAuthenticated();
		
		let gistId;
		if (isGistWorkspace()) {	
			const response = await window.showInformationMessage("Are you sure you want to delete this Gist?", DELETE_RESPONSE);
			if (response !== DELETE_RESPONSE) return;

			gistId = getGistWorkspaceId();
		} else {
			gistId = await window.showInputBox({ prompt: "Enter the Gist ID to delete" });
			if (!gistId) return;
		}

		deleteGist(gistId);
	}));

	context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.signOut`, signout));
}