import * as vscode from "vscode";

const CONFIG_SECTION = "gistpad";

export function get(key: "comments.showThread"): string;
export function get(key: "images.markdownPasteFormat"): "markdown" | "html";
export function get(key: "images.pasteType"): "file" | "base64";
export function get(key: "images.directoryName"): string;
export function get(key: "mcp.enabled"): boolean;
export function get(key: "mcp.markdownOnly"): boolean;
export function get(key: "output"): boolean;
export function get(key: "dailyNotes.directoryFormat"): string;
export function get(key: "dailyNotes.fileExtension"): string;
export function get(key: "dailyNotes.fileFormat"): string;
export function get(key: "dailyNotes.show"): boolean;
export function get(key: "showcaseUrl"): string;
export function get(key: "syncOnSave"): boolean;
export function get(key: "treeIcons"): boolean;

export function get(key: any) {
  const extensionConfig = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return extensionConfig.get(key);
}

export async function set(key: string, value: any) {
  const extensionConfig = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return extensionConfig.update(key, value, true);
}
