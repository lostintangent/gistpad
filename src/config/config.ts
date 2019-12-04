import * as vscode from 'vscode';

const CONFIG_SECTION = 'gistpad';

export async function get(key: 'pasteImageOutput'): Promise<'markdown' | 'html'>;
export async function get(key: 'pasteImageType'): Promise<'file' | 'base64'>;
export async function get(key: any) {
    const extensionConfig = vscode.workspace.getConfiguration(CONFIG_SECTION);

    return extensionConfig.get(key);
}
