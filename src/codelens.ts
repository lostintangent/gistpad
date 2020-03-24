import * as vscode from "vscode";

const MarkdownIt = require("markdown-it");

class InlineEvalCodeLensProvider implements vscode.CodeLensProvider {
  onDidChangeCodeLenses?: vscode.Event<void> | undefined;

  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const md = new MarkdownIt();
    const jsFences = md
      .parse(document.getText())
      .filter(({ type }: any) => type === "fence")
      .filter(({ block }: any) => block === true)
      .filter(({ info }: any) => info === "js");

    return jsFences.map((fence: any) => {
      const range = new vscode.Range(fence.map[0], 0, fence.map[1], 0);
      const content = fence.content;
      return new vscode.CodeLens(range, {
        title: "Run code",
        command: "gistpad.runInlineEval",
        arguments: [content]
      });
    });
  }
}

export const inlineEvalCodeLensProvider = new InlineEvalCodeLensProvider();
