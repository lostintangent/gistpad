import * as keytarType from "keytar";
import { window } from "vscode";

export type Keytar = {
	getPassword: typeof keytarType['getPassword'];
	setPassword: typeof keytarType['setPassword'];
	deletePassword: typeof keytarType['deletePassword'];
};

function getNativeKeytar(): Keytar {
	const vscodeRequire = eval("require");
	return vscodeRequire("keytar");
}

const keytar = getNativeKeytar();

const SERVICE = "vscode-gistfs";
const ACCOUNT = "gist-token";

const TOKEN_RESPONSE = "Enter token";
export async function ensureAuthenticated() {
    const password = await getToken();
    if (password) return;

    const response = await window.showErrorMessage("You need to sign-in with GitHub to perform this operation.", TOKEN_RESPONSE);
    if (response === TOKEN_RESPONSE) {
        const token = await window.showInputBox({ prompt: "Enter your GitHub token"});
        if (token) {
            await keytar.setPassword(SERVICE, ACCOUNT, token);
        } else {
            throw new Error("Authentication required")
        }
    }
}

export async function getToken() {
	const token = await keytar.getPassword(SERVICE, ACCOUNT);
	return token;
}

export async function signout() {
    await keytar.deletePassword(SERVICE, ACCOUNT);
}