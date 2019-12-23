import * as vscode from "vscode";

const CONFIG_SECTION = "gistpad";

export async function get(key: "apiUrl"): Promise<string>;
export async function get(key: "gitSSO"): Promise<boolean>;
export async function get(
  key: "pasteScreenshotOutput"
): Promise<"markdown" | "html">;
export async function get(
  key: "pasteScreenshotType"
): Promise<"file" | "base64">;
export async function get(
  key: "playground.autoRun"
): Promise<"onEdit" | "onSave" | "never">;
export async function get(key: "playground.includeMarkup"): Promise<boolean>;
export async function get(
  key: "playground.includeStylesheet"
): Promise<boolean>;
export async function get(
  key: "playground.scriptLanguage"
): Promise<"javascript" | "javascriptreact" | "typescript" | "typescriptreact">;
export async function get(key: "playground.showConsole"): Promise<boolean>;
export async function get(key: "showCommentThread"): Promise<string>;
export async function get(key: any) {
  const extensionConfig = vscode.workspace.getConfiguration(CONFIG_SECTION);

  return extensionConfig.get(key);
}
