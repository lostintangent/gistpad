import { commands, ExtensionContext, window } from "vscode";
import { EXTENSION_ID } from "../constants";
import { followUser, unfollowUser } from "../store/actions";
import { FollowedUserGistsNode } from "../tree/nodes";

export async function registerFollowCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_ID}.followUser`, async () => {
      const username = await window.showInputBox({
        prompt: "Specify the name of the user you'd like to follow"
      });

      if (username) {
        await followUser(username);
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.unfollowUser`,
      async (node: FollowedUserGistsNode) => {
        const username = node.user.username;
        await unfollowUser(username);
      }
    )
  );
}
