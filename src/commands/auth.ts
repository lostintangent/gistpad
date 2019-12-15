import { commands, env, ExtensionContext, Uri } from "vscode";
import { EXTENSION_ID } from "../constants";
import { signIn, signout } from "../store/auth";
import { GistsNode } from "../tree/nodes";

export async function registerAuthCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_ID}.signIn`, signIn)
  );
  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_ID}.signOut`, signout)
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.openProfile`,
      async (node: GistsNode) => {
        const uri = Uri.parse(`https://gist.github.com/${node.login}`);
        env.openExternal(uri);
      }
    )
  );
}
