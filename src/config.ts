import * as vscode from "vscode";

const CONFIG_SECTION = "gistpad";
const extensionConfig = vscode.workspace.getConfiguration(CONFIG_SECTION);

export default {
  get apiUrl() {
    return extensionConfig.get("apiUrl");
  }
};
