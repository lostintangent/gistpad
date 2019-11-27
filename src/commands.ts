import { commands, ExtensionContext, QuickPickItem, window, ProgressLocation } from "vscode";
import { deleteGist, forkGist, listGists, newGist, starredGists } from "./api";
import { ensureAuthenticated, isAuthenticated, signIn, signout } from "./auth";
import { EXTENSION_ID } from "./constants";
import { getGistLabel, getGistWorkspaceId, isGistWorkspace, openGist, openGistAsWorkspace } from "./utils";

interface GistQuickPickItem extends QuickPickItem {
	id?: string;
}

export function registerCommands(context: ExtensionContext) {
	async function newGistInternal(isPublic: boolean = true) {
		await ensureAuthenticated();

		const fileName = await window.showInputBox({
			prompt: "Enter the files name(s) to seed the Gist with (can be a comma-seperated list)",
			value: "foo.txt"
		});
		if (!fileName) return;
		
		const description = await window.showInputBox({
			prompt: "Enter an optional description for the new Gist",
		});
		
		window.withProgress({ location: ProgressLocation.Notification, title: "Creating Gist..." }, () => {
			const fileNames = fileName.split(",");
			return newGist(fileNames, isPublic, description);
		});
	}

	const newPublicGist = newGistInternal.bind(null, true);
	const newSecretGist = newGistInternal.bind(null, false);

	context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.newPublicGist`, newPublicGist));
	context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.newSecretGist`, newSecretGist));

	const SIGN_IN_ITEM = "Sign in to view Gists...";
	const CREATE_PUBLIC_GIST_ITEM = "$(gist-new) Create new Gist...";
	const CREATE_SECRET_GIST_ITEM = "$(gist-private) Create new secret Gist...";
	const STARRED_GIST_ITEM = "$(star) View starred Gists...";
	const CREATE_GIST_ITEMS = [
		{ label: CREATE_PUBLIC_GIST_ITEM },
		{ label: CREATE_SECRET_GIST_ITEM },
		{ label: STARRED_GIST_ITEM }
	];

	async function openGistInternal(openAsWorkspace: boolean = false) {
		let gistItems: GistQuickPickItem[] = [];
		
		if (await isAuthenticated()) {
			const gists = await listGists();

			if (gists.length > 0) {
				gistItems = gists.map(gist => {
					return <GistQuickPickItem>{  
						label: getGistLabel(gist),
						description: gist.description,
						id: gist.id
					}
				});
			}

			gistItems.push(...CREATE_GIST_ITEMS);
		} else {
			gistItems = [{ label: SIGN_IN_ITEM }];
		}

		const list = window.createQuickPick();
		list.placeholder = "Select or specify the Gist you'd like to open";
		list.items = gistItems;

		// TODO: Validate that the clipboard contains a Gist URL or ID
		//const clipboardValue = await env.clipboard.readText();
		//list.value = clipboardValue;

    	list.onDidChangeValue(gistId => {
      		list.items = gistId
        		? [{ label: gistId }, ...gistItems]
        		: gistItems;
    		});

    	list.onDidAccept(async () => {
			const gist = <GistQuickPickItem>list.selectedItems[0];

			list.hide();

			if (gist.id) {
				if (openAsWorkspace) {
					return openGistAsWorkspace(gist.id);
				} else {
					return openGist(gist.id);
				}
			} else {
				switch (gist.label) {
					case SIGN_IN_ITEM:
						await signIn();
						await openGistInternal();
						return;
					case CREATE_PUBLIC_GIST_ITEM:
						return await newPublicGist();
					case CREATE_SECRET_GIST_ITEM:
						return await newSecretGist();
					case STARRED_GIST_ITEM:
						return await listGistsInternal();
					default:
				}
			}
		});

    	list.show();
	}

	context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.openGist`, openGistInternal.bind(null, false)));
	context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.openGistWorkspace`, openGistInternal.bind(null, true)));

	async function listGistsInternal() {
		await ensureAuthenticated();

		const gists = await starredGists();
		const items = gists.map(g => ({
			label: getGistLabel(g),
			description: g.description,
			id: g.id
		}))
		
		if (items.length === 0) {
			const message = `You don't have any starred Gists`;
			return window.showInformationMessage(message)
		}

		const selected = await window.showQuickPick(items, { placeHolder: "Select the Gist you'd like to open" });

		if (selected) {
			openGist(selected.id)
		}
	}

	context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.starredGists`, listGistsInternal.bind(null)));

	context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.forkGist`, async () => {
		await ensureAuthenticated();

		// TODO: Display your list of starred Gists
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
		
		if (isGistWorkspace()) {	
			const response = await window.showInformationMessage("Are you sure you want to delete this Gist?", DELETE_RESPONSE);
			if (response !== DELETE_RESPONSE) return;

			const gistId = getGistWorkspaceId();
			deleteGist(gistId);
			commands.executeCommand("workbench.action.closeFolder");
		} else {
			const gists = await listGists();

			if (gists.length === 0) {
				return window.showInformationMessage("You don't have any Gists to delete")
			}

			const items = gists.map(g => ({
				label: getGistLabel(g),
				description: g.description,
				id: g.id
			}));
		
			const gist = await window.showQuickPick(items, { placeHolder: "Select the Gist to delete..." });
			if (!gist) return;

			await deleteGist(gist.id);
			await window.showInformationMessage("Gist deleted!");
		}
	}));

	context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.signIn`, signIn));
	context.subscriptions.push(commands.registerCommand(`${EXTENSION_ID}.signOut`, signout));
}