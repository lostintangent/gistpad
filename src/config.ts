import * as vscode from "vscode";

const CONFIG_SECTION = "gistpad";

export async function get(key: "apiUrl"): Promise<string>;
export async function get(key: "gitSSO"): Promise<boolean>;
export async function get(
  key: "images.markdownPasteFormat"
): Promise<"markdown" | "html">;
export async function get(key: "images.pasteType"): Promise<"file" | "base64">;
export async function get(
  key: "playgrounds.autoRun"
): Promise<"onEdit" | "onSave" | "never">;
export async function get(key: "playgrounds.autoSave"): Promise<boolean>;
export async function get(
  key: "playgrounds.layout"
): Promise<"grid" | "splitLeft" | "splitRight" | "splitTop">;
export async function get(key: "playgrounds.includeMarkup"): Promise<boolean>;
export async function get(
  key: "playgrounds.includeStylesheet"
): Promise<boolean>;
export async function get(
  key: "playgrounds.markupLanguage"
): Promise<"html" | "pug">;
export async function get(
  key: "playgrounds.scriptLanguage"
): Promise<"javascript" | "javascriptreact" | "typescript" | "typescriptreact">;
export async function get(
  key: "playgrounds.stylesheetLanguage"
): Promise<"css" | "less" | "sass" | "scss">;
export async function get(key: "playgrounds.showConsole"): Promise<boolean>;
export async function get(key: "comments.showThread"): Promise<string>;
export async function get(key: any) {
  const extensionConfig = vscode.workspace.getConfiguration(CONFIG_SECTION);

  return extensionConfig.get(key);
}
