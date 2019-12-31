import { commands, env, ExtensionContext, Uri } from "vscode";
import { EXTENSION_ID } from "../constants";
import { signIn, signout } from "../store/auth";
import { FollowedUserGistsNode, GistsNode } from "../tree/nodes";

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
      async (node: GistsNode | FollowedUserGistsNode) => {
        const login =
          node instanceof GistsNode ? node.login : node.user.username;
        const uri = Uri.parse(`https://gist.github.com/${login}`);
        env.openExternal(uri);
      }
    )
  );
}
