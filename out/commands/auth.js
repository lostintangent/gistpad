"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthCommands = void 0;
const vscode_1 = require("vscode");
const constants_1 = require("../constants");
const auth_1 = require("../store/auth");
const nodes_1 = require("../tree/nodes");
async function registerAuthCommands(context) {
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.signIn`, auth_1.signIn));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.openProfile`, async (node) => {
        const login = node instanceof nodes_1.GistsNode ? node.login : node.user.username;
        const uri = vscode_1.Uri.parse(`https://gist.github.com/${login}`);
        vscode_1.env.openExternal(uri);
    }));
}
exports.registerAuthCommands = registerAuthCommands;
//# sourceMappingURL=auth.js.map