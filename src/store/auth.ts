import { authentication, commands, window } from "vscode";
import { store } from ".";
import * as config from "../config";
import { EXTENSION_NAME } from "../constants";
import { log } from "../logger";
import { refreshGists } from "./actions";
const GitHub = require("github-base");

export function getCurrentUser() {
  return store.login;
}

const STATE_CONTEXT_KEY = `${EXTENSION_NAME}:state`;
const STATE_SIGNED_IN = "SignedIn";
const STATE_SIGNED_OUT = "SignedOut";

const SCOPE_HEADER = "x-oauth-scopes";
const GIST_SCOPE = "gist";
const REPO_SCOPE = "repo";
const DELETE_REPO_SCOPE = "delete_repo";

export async function getApi(newToken?: string) {
  const token = newToken || (await getToken());
  const apiurl = config.get("apiUrl");

  return new GitHub({ apiurl, token });
}

async function testToken(token: string) {
  const github = await getApi(token);

  try {
    const response = await github.get("/user");

    const scopeHeaderIndex = response.rawHeaders.findIndex(
      (item: string) => item.toLowerCase() === SCOPE_HEADER
    );
    if (scopeHeaderIndex === -1) {
      log.info(`Token test failed: No scopes header`);
      return false;
    }

    const tokenScopes = response.rawHeaders[scopeHeaderIndex + 1];
    if (!tokenScopes.includes(GIST_SCOPE)) {
      log.info(`Token test failed: Scopes don't include gist`);
      return false;
    }

    store.login = response.body.login;
    store.canCreateRepos = tokenScopes.includes(REPO_SCOPE);
    store.canDeleteRepos = tokenScopes.includes(DELETE_REPO_SCOPE);

    return true;
  } catch (e) {
    log.info(`Token test failed: ${e.message}`);
    return false;
  }
}

const TOKEN_RESPONSE = "Enter token";
export async function ensureAuthenticated() {
  if (await getToken()) {
    return;
  }

  const response = await window.showErrorMessage(
    "You need to sign-in with GitHub to perform this action.",
    TOKEN_RESPONSE
  );
  if (response === TOKEN_RESPONSE) {
    await signIn();
  }
}

export async function getToken(scopes: string[] = [GIST_SCOPE]) {
  const session = await authentication.getSession("github", scopes, {
    createIfNone: false
  });

  return session?.accessToken;
}

export async function isAuthenticated() {
  const token = await getToken();
  return token !== null;
}

async function markUserAsSignedIn() {
  store.isSignedIn = true;
  commands.executeCommand("setContext", STATE_CONTEXT_KEY, STATE_SIGNED_IN);

  await refreshGists();
}

export async function signIn() {
  if (await performSignInFlow()) {
    window.showInformationMessage(
      "You're successfully signed in and can now manage your GitHub gists and repositories!"
    );

    await markUserAsSignedIn();
  }
}

function markUserAsSignedOut() {
  store.login = "";
  store.isSignedIn = false;
  commands.executeCommand("setContext", STATE_CONTEXT_KEY, STATE_SIGNED_OUT);
}

export async function signout() {
  markUserAsSignedOut();
}
