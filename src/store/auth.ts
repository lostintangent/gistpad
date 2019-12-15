import { execSync } from "child_process";
import * as keytarType from "keytar";
import { commands, env, window } from "vscode";
import { store } from ".";
import * as config from "../config";
import { EXTENSION_ID } from "../constants";
import { refreshGists } from "./actions";

const GitHub = require("github-base");

async function fetchCurrentUser() {
  const token = await getToken();
  const apiurl = await config.get("apiUrl");
  const github = new GitHub({ apiurl, token });
  const response = await github.get("/user");
  return response.body.login;
}

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
const SERVICE = `vscode-${EXTENSION_ID}`;

const STATE_CONTEXT_KEY = `${EXTENSION_ID}:state`;
const STATE_SIGNED_IN = "SignedIn";
const STATE_SIGNED_OUT = "SignedOut";

async function attemptGitLogin(): Promise<boolean> {
  const gitSSO = await config.get("gitSSO");
  if (!gitSSO) {
    return false;
  }

  const command = `git credential fill
protocol=https
host=github.com

`;

  try {
    const response = execSync(command, { encoding: "utf8" });
    // This will return something that looks like the following...
    //
    // protocol=https
    // host=github.com
    // path=
    // username=<your-user>
    // password=<authentication-token>

    const token = response.split("password=")[1].trim();
    if (token.length > 0) {
      await keytar.setPassword(SERVICE, ACCOUNT, token);
      return true;
    }

    return false;
  } catch (e) {
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

export async function getToken() {
  const token = await keytar.getPassword(SERVICE, ACCOUNT);
  return token;
}

export async function initializeAuth() {
  markUserAsSignedOut();

  const isSignedIn = await isAuthenticated();
  if (isSignedIn || (await attemptGitLogin())) {
    await markUserAsSignedIn();
    await refreshGists();
  }
}

export async function isAuthenticated() {
  const token = await getToken();
  return token !== null;
}

async function markUserAsSignedIn() {
  store.login = await fetchCurrentUser();
  store.isSignedIn = true;
  commands.executeCommand("setContext", STATE_CONTEXT_KEY, STATE_SIGNED_IN);
}

function markUserAsSignedOut() {
  store.login = "";
  store.isSignedIn = false;
  commands.executeCommand("setContext", STATE_CONTEXT_KEY, STATE_SIGNED_OUT);
}

export async function signIn() {
  const value = await env.clipboard.readText();
  const token = await window.showInputBox({
    prompt: "Enter your GitHub token",
    value
  });
  if (token) {
    await keytar.setPassword(SERVICE, ACCOUNT, token);
    await markUserAsSignedIn();
    await refreshGists();
  } else {
    throw new Error("Authentication required");
  }
}

export async function signout() {
  await keytar.deletePassword(SERVICE, ACCOUNT);
  markUserAsSignedOut();
}
