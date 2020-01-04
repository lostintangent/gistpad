import { execGitCredentialFill } from "@abstractions/gitCredentialFill";
import { performSignInFlow } from "@abstractions/signIn";
import * as keytarType from "keytar";
import { commands, window } from "vscode";
import { store } from ".";
import * as config from "../config";
import { EXTENSION_NAME } from "../constants";
import { log } from "../logger";
import { refreshGists } from "./actions";
const GitHub = require("github-base");

export function getCurrentUser() {
  return store.login;
}

export type Keytar = {
  getPassword: typeof keytarType["getPassword"];
  setPassword: typeof keytarType["setPassword"];
  deletePassword: typeof keytarType["deletePassword"];
};

function getNativeKeytar(): Keytar {
  const vscodeRequire = eval("require");
  return vscodeRequire("keytar");
}

const keytar = getNativeKeytar();

const ACCOUNT = "gist-token";
const SERVICE = `vscode-${EXTENSION_NAME}`;

const STATE_CONTEXT_KEY = `${EXTENSION_NAME}:state`;
const STATE_SIGNED_IN = "SignedIn";
const STATE_SIGNED_OUT = "SignedOut";

const SCOPE_HEADER = "x-oauth-scopes";
const GIST_SCOPE = "gist";

async function testToken(token: string) {
  const apiurl = await config.get("apiUrl");
  const github = new GitHub({ apiurl, token });
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
    return true;
  } catch (e) {
    log.info(`Token test failed: ${e.message}`);
    return false;
  }
}

// TODO: Support SSO when using username and password vs. just a token
async function attemptGitLogin(): Promise<boolean> {
  const gitSSO = await config.get("gitSSO");
  if (!gitSSO) {
    log.info("Git SSO disabled");
    return false;
  }

  try {
    const token = execGitCredentialFill();
    if (token && token.length > 0 && (await testToken(token))) {
      log.info("Git SSO succeeded");
      await keytar.setPassword(SERVICE, ACCOUNT, token);
      return true;
    }

    return false;
  } catch (e) {
    log.info(`Git SSO failed: ${e.nessage}`);
    return false;
  }
}

const TOKEN_RESPONSE = "Enter token";
export async function ensureAuthenticated() {
  const password = await getToken();
  if (password) {
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

async function deleteToken() {
  await keytar.deletePassword(SERVICE, ACCOUNT);
}

export async function getToken() {
  const token = await keytar.getPassword(SERVICE, ACCOUNT);
  return token;
}

export async function initializeAuth() {
  markUserAsSignedOut();

  const isSignedIn = await isAuthenticated();
  if (isSignedIn) {
    log.info("Signed in, checking for token's validity...");
    const currentToken = (await getToken())!;
    const tokenStillValid = await testToken(currentToken);
    if (!tokenStillValid) {
      log.info("Clearing token, since it is no longer valud");
      await deleteToken();
      return;
    }
  } else {
    log.info("Not signed in, attempting git SSO...");
    const gitSSO = await attemptGitLogin();
    if (!gitSSO) {
      return;
    }
  }

  log.info("Marking user as signed in");
  await markUserAsSignedIn();
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
  const token = await performSignInFlow();

  if (token) {
    if (await testToken(token)) {
      await keytar.setPassword(SERVICE, ACCOUNT, token);
      await markUserAsSignedIn();
    } else {
      window.showErrorMessage(
        "The specified token isn't valid or doesn't inlcude the gist scope. Please check it and try again."
      );
    }
  }
}

function markUserAsSignedOut() {
  store.login = "";
  store.isSignedIn = false;
  commands.executeCommand("setContext", STATE_CONTEXT_KEY, STATE_SIGNED_OUT);
}

export async function signout() {
  await deleteToken();
  markUserAsSignedOut();
}
