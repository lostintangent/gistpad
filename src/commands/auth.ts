import { commands, env, ExtensionContext, Uri } from "vscode";
import { EXTENSION_NAME } from "../constants";
import { signIn } from "../store/auth";
import { FollowedUserGistsNode, GistsNode } from "../tree/nodes";

export async function registerAuthCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.signIn`, signIn)
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.openProfile`,
      async (node: GistsNode | FollowedUserGistsNode) => {
        const login =
          node instanceof GistsNode ? node.login : node.user.username;
        const uri = Uri.parse(`https://gist.github.com/${login}`);
        env.openExternal(uri);
      }
    )
  );
}
