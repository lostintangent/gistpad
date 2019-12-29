import * as vscode from "vscode";
import { getCDNJSLibraries } from "../commands/cdnjs";
import {
  getScriptContent,
  PlaygroundLibraryType
} from "../commands/playground";
import { URI_PATTERN } from "../constants";
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
    const content = getScriptContent(textDocument, this.manifest);
    if (content === null) {
      return;
    }

    this.javascript = content;

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

  private async resolveLibraries(libraryType: PlaygroundLibraryType) {
    let libraries = this[libraryType];

    if (
      !this.manifest ||
      !this.manifest[libraryType] ||
      this.manifest[libraryType]!.length === 0
    ) {
      return libraries;
    }

    await Promise.all(
      this.manifest![libraryType]!.map(async (library) => {
        if (!library || (library && !library.trim())) {
          return;
        }

        const appendLibrary = (url: string) => {
          if (libraryType === PlaygroundLibraryType.style) {
            libraries += `<link rel="stylesheet" href="${url}" />`;
          } else {
            libraries += `<script src="${url}"></script>`;
          }
        };

        const isUrl = library.match(URI_PATTERN);
        if (isUrl) {
          appendLibrary(library);
        } else {
          const libraries = await getCDNJSLibraries();
          const libraryEntry = libraries.find((lib) => lib.name === library);

          if (!libraryEntry) {
            return;
          }

          appendLibrary(libraryEntry.latest);
        }
      })
    );

    return libraries;
  }

  public async rebuildWebview() {
    const baseUrl = `https://gist.github.com/${this.gist.owner.login}/${this.gist.id}/raw/`;
    const styleId = `gistpad-playground-style-${Math.random()}`;

    const scripts = await this.resolveLibraries(PlaygroundLibraryType.script);
    const styles = await this.resolveLibraries(PlaygroundLibraryType.style);

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
