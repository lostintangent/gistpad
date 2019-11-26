import { commands, env, ExtensionContext, window } from "vscode";
import { deleteGist, forkGist, newGist, listGists, starredGists } from "./api";
import { ensureAuthenticated, signout } from "./auth";
import { EXTENSION_ID } from "./constants";
import { getGistWorkspaceId, isGistWorkspace, openGist, getGistLabel } from "./utils";

export function registerCommands(context: ExtensionContext) {
	async function listGistsInternal(showStarred: boolean = false) {
		await ensureAuthenticated();

		const gists = await (showStarred ? starredGists() : listGists());
		const items = gists.map(g => ({
			label: getGistLabel(g),
			description: g.description,
			id: g.id
		}))
		
		if (items.length === 0) {
			const message = `You don't have any${showStarred ? " starred" : ""} Gists`;
			return window.showInformationMessage(message)
		}

		const selected = await window.showQuickPick(items, { placeHolder: "Select the Gist you'd like to open" });

		if (selected) {
			openGist(selected.id)
		}
	}
 	context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.listGists`, listGistsInternal.bind(null, false)));
	context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.starredGists`, listGistsInternal.bind(null, true)));

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

	async function newGistInternal(isPublic: boolean = true) {
		await ensureAuthenticated();

		const fileName = await window.showInputBox({
			prompt: "Enter the starting file name",
			value: "foo.txt"
		});
		if (!fileName) return;
		
		const description = await window.showInputBox({
			prompt: "Enter an optional description for the new Gist",
		});
		
		newGist(fileName, isPublic, description);
	}

	context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.newPublicGist`, newGistInternal.bind(null, true)));
	context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.newSecretGist`, newGistInternal.bind(null, false)));

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