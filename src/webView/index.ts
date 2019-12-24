import * as vscode from "vscode";
import { getCDNJSLibraries } from "../commands/cdnjs";
import { getScriptContent } from "../commands/playground";
import { IPlaygroundJSON } from "../interfaces/IPlaygroundJSON";

export class PlaygroundWebview {
  private html: string = "";
  private javascript: string = "";
  private css: string = "";
  private manifest: IPlaygroundJSON | undefined;

  constructor(
    private webview: vscode.Webview,
    output: vscode.OutputChannel,
    private scripts: string = ""
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

  private async renderLibraryDependencies() {
    if (!this.manifest && !this.scripts) {
      return "";
    }

    const scripts = this.scripts;

    if (
      !this.manifest ||
      !this.manifest!.libraries ||
      this.manifest!.libraries.length === 0
    ) {
      return scripts;
    }

    const result = this.manifest!.libraries.map(async (libraryURL) => {
      if (!libraryURL || (libraryURL && !libraryURL.trim())) {
        return "";
      }

      const isUrl = libraryURL.match(
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
      );

      if (isUrl) {
        return `<script src="${libraryURL}"></script>`;
      }

      const libraries = await getCDNJSLibraries();
      const library = libraries.find((lib) => lib.name === libraryURL);

      if (library) {
        return `<script src="${library.latest}"></script>`;
      }
    });

    const libraryScripts = (await Promise.all(result)).join("");
    return `${scripts}
${libraryScripts}`;
  }

  public async rebuildWebview() {
    const libraryScripts = await this.renderLibraryDependencies();

    const styleId = `gistpad-playground-style-${Math.random()}`;

    this.webview.html = `<html>
  <head>
    <style>
      body { background-color: white; }
    </style>
    <style id="${styleId}">
      ${this.css}
    </style>
    ${libraryScripts}
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
