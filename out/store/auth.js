"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAuth = exports.elevateSignin = exports.signIn = exports.getToken = exports.ensureAuthenticated = exports.getApi = exports.getCurrentUser = void 0;
const vscode_1 = require("vscode");
const _1 = require(".");
const constants_1 = require("../constants");
const actions_1 = require("./actions");
const GitHub = require("github-base");
let loginSession;
function getCurrentUser() {
    return _1.store.login;
}
exports.getCurrentUser = getCurrentUser;
const STATE_CONTEXT_KEY = `${constants_1.EXTENSION_NAME}:state`;
const STATE_SIGNED_IN = "SignedIn";
const STATE_SIGNED_OUT = "SignedOut";
const GIST_SCOPE = "gist";
const REPO_SCOPE = "repo";
const DELETE_REPO_SCOPE = "delete_repo";
// TODO: Replace github-base with octokit
async function getApi(newToken) {
    const token = newToken || (await getToken());
    return new GitHub({ token });
}
exports.getApi = getApi;
const TOKEN_RESPONSE = "Sign in";
async function ensureAuthenticated() {
    if (_1.store.isSignedIn) {
        return;
    }
    const response = await vscode_1.window.showErrorMessage("You need to sign-in with GitHub to perform this operation.", TOKEN_RESPONSE);
    if (response === TOKEN_RESPONSE) {
        await signIn();
    }
}
exports.ensureAuthenticated = ensureAuthenticated;
async function getSession(isInteractiveSignIn = false, includeDeleteRepoScope = false) {
    const scopes = [GIST_SCOPE, REPO_SCOPE];
    if (includeDeleteRepoScope) {
        scopes.push(DELETE_REPO_SCOPE);
    }
    try {
        if (isInteractiveSignIn) {
            isSigningIn = true;
        }
        const session = await vscode_1.authentication.getSession("github", scopes, {
            createIfNone: isInteractiveSignIn
        });
        if (session) {
            loginSession = session === null || session === void 0 ? void 0 : session.id;
        }
        isSigningIn = false;
        return session;
    }
    catch { }
}
async function getToken() {
    return _1.store.token;
}
exports.getToken = getToken;
async function markUserAsSignedIn(session, refreshUI = true) {
    loginSession = session.id;
    _1.store.isSignedIn = true;
    _1.store.token = session.accessToken;
    _1.store.login = session.account.label;
    _1.store.canCreateRepos = session.scopes.includes(REPO_SCOPE);
    _1.store.canDeleteRepos = session.scopes.includes(DELETE_REPO_SCOPE);
    if (refreshUI) {
        vscode_1.commands.executeCommand("setContext", STATE_CONTEXT_KEY, STATE_SIGNED_IN);
        await (0, actions_1.refreshGists)();
    }
}
function markUserAsSignedOut() {
    loginSession = undefined;
    _1.store.login = "";
    _1.store.isSignedIn = false;
    vscode_1.commands.executeCommand("setContext", STATE_CONTEXT_KEY, STATE_SIGNED_OUT);
}
let isSigningIn = false;
async function signIn() {
    const session = await getSession(true);
    if (session) {
        vscode_1.window.showInformationMessage("You're successfully signed in and can now manage your GitHub gists and repositories!");
        await markUserAsSignedIn(session);
        return true;
    }
}
exports.signIn = signIn;
async function elevateSignin() {
    const session = await getSession(true, true);
    if (session) {
        await markUserAsSignedIn(session, false);
        return true;
    }
}
exports.elevateSignin = elevateSignin;
async function attemptSilentSignin(refreshUI = true) {
    const session = await getSession();
    if (session) {
        await markUserAsSignedIn(session, refreshUI);
    }
    else {
        await markUserAsSignedOut();
    }
}
async function initializeAuth() {
    vscode_1.authentication.onDidChangeSessions(async (e) => {
        if (e.provider.id === "github") {
            // @ts-ignore
            if (e.added.length > 0) {
                // This session was added based on a GistPad-triggered
                // sign-in, and so we don't need to do anything further to process it.
                if (isSigningIn) {
                    isSigningIn = false;
                    return;
                }
                // The end-user just signed in to Gist via the
                // VS Code account UI, and therefore, we need
                // to grab the session token/etc.
                await attemptSilentSignin();
                // @ts-ignore
            }
            else if (e.changed.length > 0 && e.changed.includes(loginSession)) {
                // TODO: Validate when this actually fires
                await attemptSilentSignin(false);
            }
            // @ts-ignore
            else if (e.removed.length > 0 && e.removed.includes(loginSession)) {
                // TODO: Implement sign out support
            }
        }
    });
    await attemptSilentSignin();
}
exports.initializeAuth = initializeAuth;
//# sourceMappingURL=auth.js.map