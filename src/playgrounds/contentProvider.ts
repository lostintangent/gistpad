import * as vscode from "vscode";

const PLAYGROUND_CONTENT_SCHEME = "gist-playground";

class PlaygroundContentProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  public readonly onDidChange: vscode.Event<vscode.Uri> = this._onDidChange
    .event;

  constructor() {}

  public async provideTextDocumentContent(
    uri: vscode.Uri,
    token: vscode.CancellationToken
  ) {
    return "";
  }
}

export function registerPlaygroundContentProvider() {
  vscode.workspace.registerTextDocumentContentProvider(
    PLAYGROUND_CONTENT_SCHEME,
    new PlaygroundContentProvider()
  );
}
