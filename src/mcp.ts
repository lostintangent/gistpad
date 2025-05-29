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

export function registerMcpServerDefinitionProvider(context: ExtensionContext) {
    // @ts-ignore
    if (!lm.registerMcpServerDefinitionProvider) return;

    const onDidChange = new EventEmitter<void>();

    // When the user signs in or update, let VS Code
    // know that it needs to refresh the MCP configuration.
    reaction(
        () => store.isSignedIn,
        () => {
            onDidChange.fire();
        }
    );

    // When the user updates any of the GistPad MCP config
    // settings, let VS Code know that it needs to refresh.
    context.subscriptions.push(
        workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("gistpad.mcp")) {
                onDidChange.fire();
            }
        })
    );

    context.subscriptions.push(
        // @ts-ignore
        lm.registerMcpServerDefinitionProvider("gistpad", {
            onDidChangeMcpServerDefinitions: onDidChange.event,
            provideMcpServerDefinitions() {
                if (!store.isSignedIn || !config.get("mcp.enabled")) return [];

                const args = ["-y", "gistpad-mcp"];
                if (config.get("mcp.markdownOnly")) {
                    args.push("--markdown");
                }

                return [
                    new McpStdioServerDefinition("GistPad", "npx", args, {
                        GITHUB_TOKEN: store.token!
                    })
                ];
            }
        })
    );
}
