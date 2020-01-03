import * as vscode from "vscode";

export async function pasteImageCommand() {
  vscode.window.showErrorMessage("Paste image is not supported in the browser");
}
