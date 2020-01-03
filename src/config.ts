import * as vscode from "vscode";

const CONFIG_SECTION = "gistpad";

export async function get(key: "apiUrl"): Promise<string>;
export async function get(key: "gitSSO"): Promise<boolean>;
export async function get(
  key: "image.markdownPasteFormat"
): Promise<"markdown" | "html">;
export async function get(key: "image.pasteType"): Promise<"file" | "base64">;
export async function get(
  key: "playground.autoRun"
): Promise<"onEdit" | "onSave" | "never">;
export async function get(key: "playground.autoSave"): Promise<boolean>;
export async function get(
  key: "playground.layout"
): Promise<"grid" | "splitLeft" | "splitRight" | "splitTop">;
export async function get(key: "playground.includeMarkup"): Promise<boolean>;
export async function get(
  key: "playground.includeStylesheet"
): Promise<boolean>;
export async function get(
  key: "playground.markupLanguage"
): Promise<"html" | "pug">;
export async function get(
  key: "playground.scriptLanguage"
): Promise<"javascript" | "javascriptreact" | "typescript" | "typescriptreact">;
export async function get(
  key: "playground.stylesheetLanguage"
): Promise<"css" | "less" | "sass" | "scss">;
export async function get(key: "playground.showConsole"): Promise<boolean>;
export async function get(key: "showCommentThread"): Promise<string>;
export async function get(key: any) {
  const extensionConfig = vscode.workspace.getConfiguration(CONFIG_SECTION);

  return extensionConfig.get(key);
}
