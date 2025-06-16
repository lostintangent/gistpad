import { reaction } from "mobx";
import {
    EventEmitter,
    ExtensionContext,
    lm,
    // @ts-ignore
    McpStdioServerDefinition,
    workspace
} from "vscode";
import * as config from "./config";
import { store } from "./store";

const onDidChange = new EventEmitter<void>();

export function reloadMcpServer() {
    onDidChange.fire();
}

export function registerMcpServerDefinitionProvider(context: ExtensionContext) {
    if (!lm.registerMcpServerDefinitionProvider) return;

    // When the user signs in or out, let VS Code
    // know that it needs to refresh the MCP configuration.
    reaction(() => store.isSignedIn, reloadMcpServer);

    // When the user updates any of the GistPad MCP config
    // settings, let VS Code know that it needs to refresh.
    context.subscriptions.push(
        workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("gistpad.mcp")) {
                reloadMcpServer();
            }
        })
    );

    context.subscriptions.push(
        lm.registerMcpServerDefinitionProvider("gistpad", {
            onDidChangeMcpServerDefinitions: onDidChange.event,
            provideMcpServerDefinitions() {
                if (!store.isSignedIn || !config.get("mcp.enabled")) return [];

                const args = ["-y", "gistpad-mcp"];

                if (config.get("mcp.markdownOnly") === true) args.push("--markdown");

                if (config.get("mcp.resources.includeStarred") === true)
                    args.push("--starred");

                if (config.get("mcp.resources.includeArchived") === true)
                    args.push("--archived");

                return [
                    new McpStdioServerDefinition("GistPad", "npx", args, {
                        GITHUB_TOKEN: store.token!
                    })
                ];
            }
        })
    );
}
