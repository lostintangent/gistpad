"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.set = exports.get = void 0;
const vscode = require("vscode");
const CONFIG_SECTION = "gistpad";
function get(key) {
    const extensionConfig = vscode.workspace.getConfiguration(CONFIG_SECTION);
    return extensionConfig.get(key);
}
exports.get = get;
async function set(key, value) {
    const extensionConfig = vscode.workspace.getConfiguration(CONFIG_SECTION);
    return extensionConfig.update(key, value, true);
}
exports.set = set;
//# sourceMappingURL=config.js.map