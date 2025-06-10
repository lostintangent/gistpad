"use strict";
// This file is heavily copied from https://github.com/svsool/vscode-memo/blob/master/src/extensions/syntaxDecorations.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLinkDecorator = registerLinkDecorator;
const vscode_1 = require("vscode");
const fileSystem_1 = require("../fileSystem");
const decorationTypes = {
    gray: vscode_1.window.createTextEditorDecorationType({
        rangeBehavior: 1,
        dark: { color: "#636363" },
        light: { color: "#CCC" }
    }),
    lightBlue: vscode_1.window.createTextEditorDecorationType({
        color: "#4080D0"
    })
};
const decors = {};
const regexToDecorationTypes = {
    ["(\\[\\[)([^\\[\\]]+?)(\\]\\])"]: ["gray", "lightBlue", "gray"],
    ["(#)([^\\s]+)"]: ["gray", "lightBlue"]
};
function getDecorations(document) {
    Object.keys(decorationTypes).forEach((decorTypeName) => {
        decors[decorTypeName] = [];
    });
    document
        .getText()
        .split(/\r?\n/g)
        .forEach((lineText, lineNum) => {
        // Trick. Match `[alt](link)` and `![alt](link)` first and remember those greyed out ranges
        const noDecorRanges = [];
        Object.keys(regexToDecorationTypes).forEach((reText) => {
            const decorTypeNames = regexToDecorationTypes[reText];
            const regex = new RegExp(reText, "g");
            let match;
            while ((match = regex.exec(lineText)) !== null) {
                let startIndex = match.index;
                if (noDecorRanges.some((r) => (startIndex > r[0] && startIndex < r[1]) ||
                    (match &&
                        startIndex + match[0].length > r[0] &&
                        startIndex + match[0].length < r[1]))) {
                    continue;
                }
                for (let i = 0; i < decorTypeNames.length; i++) {
                    const decorTypeName = decorTypeNames[i];
                    const caughtGroup = decorTypeName === "codeSpan" ? match[0] : match[i + 1];
                    if (decorTypeName === "gray" && caughtGroup.length > 2) {
                        noDecorRanges.push([startIndex, startIndex + caughtGroup.length]);
                    }
                    const range = new vscode_1.Range(lineNum, startIndex, lineNum, startIndex + caughtGroup.length);
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
function updateDecorations(textEditor) {
    const editor = textEditor || vscode_1.window.activeTextEditor;
    const doc = editor === null || editor === void 0 ? void 0 : editor.document;
    if (!editor || !doc) {
        return;
    }
    const decors = getDecorations(editor.document);
    Object.keys(decors).forEach((decorTypeName) => {
        editor &&
            editor.setDecorations(decorationTypes[decorTypeName], decors[decorTypeName]);
    });
}
function isWikiDocument(document) {
    if (!document.uri.path.endsWith(".md")) {
        return false;
    }
    if (!fileSystem_1.RepoFileSystemProvider.isRepoDocument(document)) {
        return false;
    }
    const [repo] = fileSystem_1.RepoFileSystemProvider.getRepoInfo(document.uri);
    return repo.isWiki;
}
function registerLinkDecorator() {
    vscode_1.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && isWikiDocument(editor.document)) {
            updateDecorations(editor);
        }
    });
    vscode_1.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode_1.window.activeTextEditor;
        if (!isWikiDocument(editor.document)) {
            return;
        }
        let timeout = null;
        const triggerUpdateDecorations = (editor) => {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => updateDecorations(editor), 1000);
        };
        if (editor !== undefined && event.document === editor.document) {
            triggerUpdateDecorations(editor);
        }
    });
    if (vscode_1.window.activeTextEditor &&
        isWikiDocument(vscode_1.window.activeTextEditor.document)) {
        updateDecorations(vscode_1.window.activeTextEditor);
    }
}
//# sourceMappingURL=decorator.js.map