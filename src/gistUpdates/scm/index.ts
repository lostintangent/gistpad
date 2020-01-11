import * as path from 'path';
import * as vscode from 'vscode';

function createResourceUri(relativePath: string): vscode.Uri {
    const absolutePath = path.join(vscode.workspace.rootPath!, relativePath);
    return vscode.Uri.file(absolutePath);
}

export const registerScm = () => {
    const gistPad = vscode.scm.createSourceControl('gistpad', 'GistPad');

    const index = gistPad.createResourceGroup('index', 'Gistpad Updates');
    index.resourceStates = [
        { resourceUri: createResourceUri('README.md') },
        { resourceUri: vscode.Uri.file(path.join(vscode.workspace.rootPath!, '/test/api/a.ts')) },
        { resourceUri: vscode.Uri.file(path.join(vscode.workspace.rootPath!, '/test/api/b.ts')) },
        { resourceUri: vscode.Uri.file(path.join(vscode.workspace.rootPath!, '/test/api/c.ts')) },
    ];
}