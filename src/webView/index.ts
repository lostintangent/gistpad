import * as vscode from "vscode";
import { getPlaygroundJson } from "../commands/addPlaygroundLibraryCommand";
import { getCDNJSLibraries } from "../commands/cdnjs";
import { IPlaygroundJSON } from "../interfaces/IPlaygroundJSON";

const STYLE_ID = "gistpad-playground-style";
export class PlaygroundWebview {
  private html: string = "";
  private javascript: string = "";
  private css: string = "";

  private manifest: IPlaygroundJSON | undefined;

  constructor(private webview: vscode.Webview, output: vscode.OutputChannel) {
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

    this.rebuildWebview();
  }

  public async updateLibraryDependencies(playgroundText: string) {
    this.manifest = getPlaygroundJson(playgroundText);
    await this.rebuildWebview();
  }

  public async updateHTML(html: string) {
    this.html = html;
    await this.rebuildWebview();
  }

  public async updateJavaScript(javascript: string) {
    this.javascript = javascript;
    await this.rebuildWebview();
  }

  public updateCSS(css: string) {
    this.css = css;
    this.webview.postMessage({ command: "updateCSS", value: css });
  }

  private async renderLibraryDependencies() {
    if (!this.manifest) {
      return "";
    }

    const { libraries } = this.manifest;

    if (!libraries) {
      return "";
    }

    const result = Object.entries(libraries).map(async ([_, libraryLink]) => {
      if (!libraryLink || !libraryLink.trim()) {
        return "";
      }

      const isUrl = libraryLink.match(
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
      );

      if (isUrl) {
        return `<script src="${libraryLink}"></script>`;
      }

      const libraries = await getCDNJSLibraries();
      const library = libraries.find((lib) => {
        return lib.name === libraryLink;
      });

      if (library) {
        return `<script src="${library.latest}"></script>`;
      }

      return `<script>
        const vscode = acquireVsCodeApi();
        vscode.postMessage({
          command: "alert",
          value: 'The library "${libraryLink}" not found.'
        });
      </script>`;
    });

    const scripts = (await Promise.all(result)).join("");

    return scripts;
  }

  private async rebuildWebview() {
    const libraryScripts = await this.renderLibraryDependencies();

    this.webview.html = `<html>
  <head>
    <style>
      body { background-color: white; }
    </style>
    <style id="${STYLE_ID}">
      ${this.css}
    </style>
    ${libraryScripts}
    <script>
      document.getElementById("_defaultStyles").remove();

      const vscode = acquireVsCodeApi();
      const style = document.getElementById("${STYLE_ID}");
  
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
