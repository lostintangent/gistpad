import * as vscode from "vscode";
import { getCDNJSLibraries } from "../commands/cdnjs";
import { getScriptContent } from "../commands/playground";
import { IPlaygroundJSON } from "../interfaces/IPlaygroundJSON";
import { Gist } from "../store";

export class PlaygroundWebview {
  private html: string = "";
  private javascript: string = "";
  private css: string = "";
  private manifest: IPlaygroundJSON | undefined;

  constructor(
    private webview: vscode.Webview,
    output: vscode.OutputChannel,
    private gist: Gist,
    private scripts: string = "",
    private styles: string = ""
  ) {
    webview.onDidReceiveMessage(({ command, value }) => {
      switch (command) {
        case "alert":
          if (value) {
            vscode.window.showInformationMessage(value);
          }
          break;
        case "clear":
          output.clear();
          break;
        case "log":
          output.appendLine(value);
          break;
      }
    });
  }

  public async updateManifest(manifest: string, rebuild = false) {
    if (!manifest) {
      return;
    }

    try {
      this.manifest = JSON.parse(manifest);

      if (rebuild) {
        await this.rebuildWebview();
      }
    } catch (e) {
      // The user might have typed invalid JSON
    }
  }

  public async updateHTML(html: string, rebuild = false) {
    this.html = html;

    if (rebuild) {
      await this.rebuildWebview();
    }
  }

  public async updateJavaScript(
    textDocument: vscode.TextDocument,
    rebuild = false
  ) {
    this.javascript = getScriptContent(textDocument, this.manifest);

    if (rebuild) {
      await this.rebuildWebview();
    }
  }

  public updateCSS(css: string, rebuild = false) {
    this.css = css;

    if (rebuild) {
      this.webview.postMessage({ command: "updateCSS", value: css });
    }
  }

  private async resolveLibraries() {
    const libraryReferences = {
      scripts: this.scripts,
      styles: this.styles
    };

    if (
      !this.manifest ||
      !this.manifest.libraries ||
      this.manifest.libraries.length === 0
    ) {
      return libraryReferences;
    }

    await Promise.all(
      this.manifest!.libraries.map(async (library) => {
        if (!library || (library && !library.trim())) {
          return;
        }

        const isUrl = library.match(
          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
        );

        if (isUrl) {
          if (library.endsWith(".css")) {
            libraryReferences.styles += `<link rel="stylesheet" href="${library}" />`;
          } else {
            libraryReferences.scripts += `<script src="${library}"></script>`;
          }

          return;
        }

        const libraries = await getCDNJSLibraries();
        const libraryEntry = libraries.find((lib) => lib.name === library);

        if (libraryEntry) {
          if (libraryEntry.latest.endsWith(".css")) {
            libraryReferences.styles += `<link rel="stylesheet" href="${libraryEntry.latest}" />`;
          } else {
            libraryReferences.scripts += `<script src="${libraryEntry.latest}"></script>`;
          }
        }
      })
    );

    return libraryReferences;
  }

  public async rebuildWebview() {
    const { scripts, styles } = await this.resolveLibraries();

    const baseUrl = `https://gist.github.com/${this.gist.owner.login}/${this.gist.id}/raw/`;
    const styleId = `gistpad-playground-style-${Math.random()}`;

    this.webview.html = `<html>
  <head>
    <base href="${baseUrl}" />
    <style>
      body { background-color: white; }
    </style>
    ${styles}
    <style id="${styleId}">
      ${this.css}
    </style>
    ${scripts}
    <script>
      document.getElementById("_defaultStyles").remove();

      const vscode = acquireVsCodeApi();
      const style = document.getElementById("${styleId}");
  
      window.addEventListener("message", ({ data }) => {    
        if (data.command === "updateCSS") {
          style.textContent = data.value;
        }
      });
    
      window.alert = (message) => {
        vscode.postMessage({
          command: "alert",
          value: message
        });
      };

      console.clear = () => {
        vscode.postMessage({
          command: "clear",
          value: ""
        });
      };

      console.log = (message) => {
        vscode.postMessage({
          command: "log",
          value: message
        });
      };

    </script>
  </head>
  <body>
    ${this.html}
    <script>
      ${this.javascript}
    </script>
  </body>
</html>`;
  }
}
