import { IPlaygroundJSON } from "src/interfaces/IPlaygroundJSON";
import * as vscode from "vscode";
import { getPlaygroundJson } from "../commands/playgroundDependencies";

const STYLE_ID = "gistpad-playground-style";
export class PlaygroundWebview {
  private html: string = "";
  private javascript: string = "";
  private css: string = "";

  private manifest: IPlaygroundJSON | undefined;

  constructor(private webview: vscode.Webview) {
    webview.onDidReceiveMessage(({ command, value }) => {
      if (command === "alert") {
        if (value) {
          vscode.window.showInformationMessage(value);
        }
      }
    });

    this.rebuildWebview();
  }

  public updateLibraryDependencies(playgroundText: string) {
    this.manifest = getPlaygroundJson(playgroundText);
    this.rebuildWebview();
  }

  public updateHTML(html: string) {
    this.html = html;
    this.rebuildWebview();
  }

  public updateJavaScript(javascript: string) {
    this.javascript = javascript;
    this.rebuildWebview();
  }

  public updateCSS(css: string) {
    this.css = css;
    this.webview.postMessage({ command: "updateCSS", value: css });
  }

  private renderLibraryDependencies() {
    if (!this.manifest) {
      return "";
    }

    const { dependencies } = this.manifest;

    if (!dependencies) {
      return "";
    }

    const result = Object.entries(dependencies).map(([_, libraryLink]) => {
      return `<script src="${libraryLink}"></script>`;
    });

    return result.join("");
  }

  private rebuildWebview() {
    this.webview.html = `<html>
  <head>
    <style>
      body { background-color: white; }
    </style>
    <style id="${STYLE_ID}">
      ${this.css}
    </style>
    ${this.renderLibraryDependencies()}
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
