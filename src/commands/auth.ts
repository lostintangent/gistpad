import { commands, ExtensionContext } from "vscode";
import { EXTENSION_ID } from "../constants";
import { signIn, signout } from "../store/auth";

export async function registerAuthCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_ID}.signIn`, signIn)
  );
  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_ID}.signOut`, signout)
  );
}
