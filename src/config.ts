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
  key: "playgroundScriptLanguage"
): Promise<"javascript" | "typescript">;
export async function get(key: "showCommentThread"): Promise<string>;
export async function get(key: any) {
  const extensionConfig = vscode.workspace.getConfiguration(CONFIG_SECTION);

  return extensionConfig.get(key);
}
