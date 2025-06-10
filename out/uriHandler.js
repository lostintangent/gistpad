"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGistPadOpenUrl = createGistPadOpenUrl;
exports.createGistPadWebUrl = createGistPadWebUrl;
exports.registerProtocolHandler = registerProtocolHandler;
const mobx_1 = require("mobx");
const url_1 = require("url");
const vscode = require("vscode");
const constants_1 = require("./constants");
const store_1 = require("./repos/store");
const actions_1 = require("./repos/store/actions");
const store_2 = require("./store");
const actions_2 = require("./store/actions");
const auth_1 = require("./store/auth");
const utils_1 = require("./utils");
const OPEN_PATH = "/open";
const GIST_PARAM = "gist";
const REPO_PARAM = "repo";
const FILE_PARAM = "file";
async function ensureAuthenticated() {
    await (0, mobx_1.when)(() => store_2.store.isSignedIn, { timeout: 3000 });
    await (0, auth_1.ensureAuthenticated)();
    if (!store_2.store.isSignedIn)
        throw new Error();
}
async function handleFollowRequest(query) {
    await ensureAuthenticated();
    const user = query.get("user");
    if (user) {
        (0, actions_2.followUser)(user);
        vscode.commands.executeCommand("workbench.view.extension.gistpad");
    }
}
async function handleOpenRequest(query) {
    const gistId = query.get(GIST_PARAM);
    const repoName = query.get(REPO_PARAM);
    const file = query.get(FILE_PARAM);
    const openAsWorkspace = query.get("workspace") !== null;
    if (gistId) {
        if (file) {
            const uri = (0, utils_1.fileNameToUri)(gistId, (0, utils_1.decodeDirectoryName)(file));
            (0, utils_1.openGistFile)(uri);
        }
        else {
            (0, utils_1.openGist)(gistId, !!openAsWorkspace);
        }
    }
    else if (repoName) {
        (0, actions_1.openRepo)(repoName, true);
    }
}
async function handleDailyRequest() {
    (0, utils_1.withProgress)("Opening daily note...", async () => {
        await ensureAuthenticated();
        // We need to wait for the gists to fully load
        // so that we know whether there's already a
        // daily gist or not, before opening it.
        await (0, mobx_1.when)(() => !store_2.store.isLoading);
        await vscode.commands.executeCommand("gistpad.gists.focus");
        await (0, actions_2.openTodayNote)(false);
    });
}
async function handleTodayRequest() {
    (0, utils_1.withProgress)("Opening today page...", async () => {
        await ensureAuthenticated();
        await (0, mobx_1.when)(() => store_1.store.wiki !== undefined && !store_1.store.wiki.isLoading, { timeout: 15000 });
        if (store_1.store.wiki) {
            await vscode.commands.executeCommand("gistpad.repos.focus");
            await vscode.commands.executeCommand(`${constants_1.EXTENSION_NAME}.openTodayPage`, null, false);
        }
        else {
            if (await vscode.window.showErrorMessage("You don't currently have a wiki repo. Create or open one, then try again.", "Open repo")) {
                vscode.commands.executeCommand(`${constants_1.EXTENSION_NAME}.openRepository`);
            }
        }
    });
}
function createGistPadOpenUrl(gistId, file) {
    const fileParam = file ? `&${FILE_PARAM}=${file}` : "";
    return `vscode://${constants_1.EXTENSION_ID}${OPEN_PATH}?${GIST_PARAM}=${gistId}${fileParam}`;
}
function createGistPadWebUrl(gistId, file = "README.md", preview = true) {
    const path = file && file !== "README.md" ? `/${file}` : "";
    const query = preview ? `?view=preview` : "";
    return `https://gistpad.dev/#${gistId}${path}${query}`;
}
class GistPadPUriHandler {
    async handleUri(uri) {
        const query = new url_1.URLSearchParams(uri.query);
        switch (uri.path) {
            case OPEN_PATH:
                return await handleOpenRequest(query);
            case "/follow":
                return await handleFollowRequest(query);
            case "/daily":
                return await handleDailyRequest();
            case "/today":
                return await handleTodayRequest();
        }
    }
}
function registerProtocolHandler() {
    if (typeof vscode.window.registerUriHandler === "function") {
        vscode.window.registerUriHandler(new GistPadPUriHandler());
    }
}
//# sourceMappingURL=uriHandler.js.map