"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMcpServerDefinitionProvider = registerMcpServerDefinitionProvider;
const mobx_1 = require("mobx");
const vscode_1 = require("vscode");
const config = require("./config");
const store_1 = require("./store");
function registerMcpServerDefinitionProvider(context) {
    // @ts-ignore
    if (!vscode_1.lm.registerMcpServerDefinitionProvider)
        return;
    const onDidChange = new vscode_1.EventEmitter();
    // When the user signs in or update, let VS Code
    // know that it needs to refresh the MCP configuration.
    (0, mobx_1.reaction)(() => store_1.store.isSignedIn, () => {
        onDidChange.fire();
    });
    // When the user updates any of the GistPad MCP config
    // settings, let VS Code know that it needs to refresh.
    context.subscriptions.push(vscode_1.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("gistpad.mcp")) {
            onDidChange.fire();
        }
    }));
    context.subscriptions.push(
    // @ts-ignore
    vscode_1.lm.registerMcpServerDefinitionProvider("gistpad", {
        onDidChangeMcpServerDefinitions: onDidChange.event,
        provideMcpServerDefinitions() {
            if (!store_1.store.isSignedIn || !config.get("mcp.enabled"))
                return [];
            const args = ["-y", "gistpad-mcp"];
            if (config.get("mcp.markdownOnly")) {
                args.push("--markdown");
            }
            return [
                new vscode_1.McpStdioServerDefinition("GistPad", "npx", args, {
                    GITHUB_TOKEN: store_1.store.token
                })
            ];
        }
    }));
}
//# sourceMappingURL=mcp.js.map