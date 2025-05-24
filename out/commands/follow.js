"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFollowCommands = void 0;
const vscode_1 = require("vscode");
const constants_1 = require("../constants");
const actions_1 = require("../store/actions");
async function registerFollowCommands(context) {
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.followUser`, async () => {
        const value = await vscode_1.env.clipboard.readText();
        const username = await vscode_1.window.showInputBox({
            prompt: "Specify the name of the user you'd like to follow",
            value
        });
        if (username) {
            await (0, actions_1.followUser)(username);
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.unfollowUser`, async (targetNode, multiSelectNodes) => {
        const nodes = multiSelectNodes || [targetNode];
        for (const node of nodes) {
            const username = node.user.username;
            await (0, actions_1.unfollowUser)(username);
        }
    }));
}
exports.registerFollowCommands = registerFollowCommands;
//# sourceMappingURL=follow.js.map