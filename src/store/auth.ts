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
  const getTokenTask = Promise.race([
    await keytar.getPassword(SERVICE, ACCOUNT),
    new Promise((res, rej) => {
      setTimeout(() => {
        rej("Token retrieval took too long.");
      }, 5000);
    })
  ]);

  const token = await getTokenTask;

  return token;
}

export async function initializeAuth() {
  markUserAsSignedOut();

  const isSignedIn = await isAuthenticated();
  if (isSignedIn) {
    await markUserAsSignedIn();
    await refreshGists();
  }
}

export async function isAuthenticated() {
  return (await getToken()) !== null;
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
