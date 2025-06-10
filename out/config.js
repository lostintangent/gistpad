"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = get;
exports.set = set;
const vscode = require("vscode");
const CONFIG_SECTION = "gistpad";
function get(key) {
    const extensionConfig = vscode.workspace.getConfiguration(CONFIG_SECTION);
    return extensionConfig.get(key);
}
async function set(key, value) {
    const extensionConfig = vscode.workspace.getConfiguration(CONFIG_SECTION);
    return extensionConfig.update(key, value, true);
}
//# sourceMappingURL=config.js.map