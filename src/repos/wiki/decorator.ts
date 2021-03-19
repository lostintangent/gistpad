// This file is heavily copied from https://github.com/svsool/vscode-memo/blob/master/src/extensions/syntaxDecorations.ts

import {
  Range,
  TextDocument,
  TextEditor,
  TextEditorDecorationType,
  window,
  workspace
} from "vscode";
import { RepoFileSystemProvider } from "../fileSystem";

const decorationTypes: { [type: string]: TextEditorDecorationType } = {
  gray: window.createTextEditorDecorationType({
    rangeBehavior: 1,
    dark: { color: "#636363" },
    light: { color: "#CCC" }
  }),
  lightBlue: window.createTextEditorDecorationType({
    color: "#4080D0"
  })
};

const decors: { [decorTypeName: string]: Range[] } = {};

const regexToDecorationTypes: { [regexp: string]: string[] } = {
  ["(\\[\\[)([^\\[\\]]+?)(\\]\\])"]: ["gray", "lightBlue", "gray"],
  ["(#)([^\\s]+)"]: ["gray", "lightBlue"]
};

function getDecorations(document: TextDocument) {
  Object.keys(decorationTypes).forEach((decorTypeName) => {
    decors[decorTypeName] = [];
  });

  document
    .getText()
    .split(/\r?\n/g)
    .forEach((lineText, lineNum) => {
      // Trick. Match `[alt](link)` and `![alt](link)` first and remember those greyed out ranges
      const noDecorRanges: [number, number][] = [];

      Object.keys(regexToDecorationTypes).forEach((reText) => {
        const decorTypeNames: string[] = regexToDecorationTypes[reText];
        const regex = new RegExp(reText, "g");

        let match: RegExpExecArray | null;
        while ((match = regex.exec(lineText)) !== null) {
          let startIndex = match.index;

          if (
            noDecorRanges.some(
              (r) =>
                (startIndex > r[0] && startIndex < r[1]) ||
                (match &&
                  startIndex + match[0].length > r[0] &&
                  startIndex + match[0].length < r[1])
            )
          ) {
            continue;
          }

          for (let i = 0; i < decorTypeNames.length; i++) {
            const decorTypeName = decorTypeNames[i];
            const caughtGroup =
              decorTypeName === "codeSpan" ? match[0] : match[i + 1];

            if (decorTypeName === "gray" && caughtGroup.length > 2) {
              noDecorRanges.push([startIndex, startIndex + caughtGroup.length]);
            }

            const range = new Range(
              lineNum,
              startIndex,
              lineNum,
              startIndex + caughtGroup.length
            );
            startIndex += caughtGroup.length;

            //// Needed for `[alt](link)` rule. And must appear after `startIndex += caughtGroup.length;`
            if (decorTypeName.length === 0) {
              continue;
            }
            decors[decorTypeName].push(range);
          }
        }
      });
    });

  return decors;
}

function updateDecorations(textEditor?: TextEditor) {
  const editor = textEditor || window.activeTextEditor;
  const doc = editor?.document;

  if (!editor || !doc) {
    return;
  }

  const decors = getDecorations(editor.document);
  Object.keys(decors).forEach((decorTypeName) => {
    editor &&
      editor.setDecorations(
        decorationTypes[decorTypeName],
        decors[decorTypeName]
      );
  });
}

function isWikiDocument(document: TextDocument) {
  if (!document.uri.path.endsWith(".md")) {
    return false;
  }

  if (!RepoFileSystemProvider.isRepoDocument(document)) {
    return false;
  }

  const [repo] = RepoFileSystemProvider.getRepoInfo(document.uri)!;
  return repo.isWiki;
}

export function registerLinkDecorator() {
  window.onDidChangeActiveTextEditor((editor) => {
    if (editor && isWikiDocument(editor.document)) {
      updateDecorations(editor);
    }
  });

  workspace.onDidChangeTextDocument((event) => {
    const editor = window.activeTextEditor;
    if (!isWikiDocument(editor!.document)) {
      return;
    }

    let timeout: NodeJS.Timer | null = null;
    const triggerUpdateDecorations = (editor: TextEditor) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => updateDecorations(editor), 1000);
    };

    if (editor !== undefined && event.document === editor.document) {
      triggerUpdateDecorations(editor);
    }
  });

  if (
    window.activeTextEditor &&
    isWikiDocument(window.activeTextEditor.document)
  ) {
    updateDecorations(window.activeTextEditor);
  }
}
