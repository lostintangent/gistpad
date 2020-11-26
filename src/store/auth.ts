import {
  authentication,
  AuthenticationSession,
  commands,
  window
} from "vscode";
import { store } from ".";
import * as config from "../config";
import { EXTENSION_NAME } from "../constants";
import { refreshGists } from "./actions";
const GitHub = require("github-base");

export function getCurrentUser() {
  return store.login;
}

const STATE_CONTEXT_KEY = `${EXTENSION_NAME}:state`;
const STATE_SIGNED_IN = "SignedIn";
const STATE_SIGNED_OUT = "SignedOut";

const GIST_SCOPE = "gist";
const REPO_SCOPE = "repo";
const DELETE_REPO_SCOPE = "delete_repo";

export async function getApi(newToken?: string) {
  const token = newToken || (await getToken());
  const apiurl = config.get("apiUrl");

  return new GitHub({ apiurl, token });
}

const TOKEN_RESPONSE = "Enter token";
export async function ensureAuthenticated() {
  const token = await getToken();
  if (token) {
    return;
  }

  const response = await window.showErrorMessage(
    "You need to sign-in with GitHub to perform this operation.",
    TOKEN_RESPONSE
  );
  if (response === TOKEN_RESPONSE) {
    await signIn();
  }
}

async function getSession(promptUser: boolean = false) {
  return await authentication.getSession(
    "github",
    [GIST_SCOPE, REPO_SCOPE, DELETE_REPO_SCOPE],
    { createIfNone: promptUser }
  );
}

export async function getToken() {
  return store.token;
}

async function attemptSignin() {
  const session = await getSession();
  if (session) {
    await markUserAsSignedIn(session);
  }
}

export async function initializeAuth() {
  markUserAsSignedOut();

  authentication.onDidChangeSessions(async (e) => {
    if (!store.isSignedIn && e.provider.id === "github") {
      await attemptSignin();
    }
  });

  await attemptSignin();
}

export async function isAuthenticated() {
  const token = await getToken();
  return token !== null;
}

async function markUserAsSignedIn(session: AuthenticationSession) {
  store.isSignedIn = true;
  store.token = session.accessToken;
  store.login = session.account.label;
  store.canCreateRepos = session.scopes.includes(REPO_SCOPE);
  store.canDeleteRepos = session.scopes.includes(DELETE_REPO_SCOPE);

  commands.executeCommand("setContext", STATE_CONTEXT_KEY, STATE_SIGNED_IN);

  await refreshGists();
}

export async function signIn() {
  const session = await getSession(true);

  if (session) {
    window.showInformationMessage(
      "You're successfully signed in and can now manage your GitHub gists and repositories!"
    );
    await markUserAsSignedIn(session);
  }
}

function markUserAsSignedOut() {
  store.login = "";
  store.isSignedIn = false;
  commands.executeCommand("setContext", STATE_CONTEXT_KEY, STATE_SIGNED_OUT);
}
