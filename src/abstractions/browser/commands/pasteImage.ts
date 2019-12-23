import * as vscode from "vscode";
import { createCommand } from "../../../utils/createCommand";

export const pasteImageCommand = createCommand(() => {
  vscode.window.showErrorMessage("Paste image is not supported in the browser");
});
