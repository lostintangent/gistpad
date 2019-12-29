import { commands, env, ExtensionContext, window } from "vscode";
import { EXTENSION_ID } from "../constants";
import { followUser, unfollowUser } from "../store/actions";
import { FollowedUserGistsNode } from "../tree/nodes";

export async function registerFollowCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_ID}.followUser`, async () => {
      const value = await env.clipboard.readText();
      const username = await window.showInputBox({
        prompt: "Specify the name of the user you'd like to follow",
        value
      });

      if (username) {
        await followUser(username);
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_ID}.unfollowUser`,
      async (
        targetNode: FollowedUserGistsNode,
        multiSelectNodes?: FollowedUserGistsNode[]
      ) => {
        const nodes = multiSelectNodes || [targetNode];

        for (const node of nodes) {
          const username = node.user.username;
          await unfollowUser(username);
        }
      }
    )
  );
}
