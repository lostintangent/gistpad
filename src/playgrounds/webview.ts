import axios from "axios";
import { reaction } from "mobx";
import * as vscode from "vscode";
import { getCDNJSLibraries } from "../commands/cdnjs";
import {
  getScriptContent,
  PlaygroundLibraryType,
  PlaygroundManifest
} from "../commands/playground";
import * as config from "../config";
import { URI_PATTERN } from "../constants";
import { Gist } from "../store";
import { fileNameToUri } from "../utils";

export class PlaygroundWebview {
  private css: string = "";
  private html: string = "";
  private javascript: string = "";
  private isJavaScriptModule: boolean = false;
  private manifest: PlaygroundManifest | undefined;
  private readme: string = "";
  private baseUrl = "";

  private updateBaseUrl() {
    const owner = this.gist.owner ? this.gist.owner.login : "anonymous";
    const version = this.gist.history ? this.gist.history[0].version + "/" : "";

    this.baseUrl = `https://gist.githack.com/${owner}/${this.gist.id}/raw/${version}`;
  }

  constructor(
    private webview: vscode.Webview,
    output: vscode.OutputChannel,
    private gist: Gist,
    private codePenScripts: string = "",
    private codePenStyles: string = ""
  ) {
    this.updateBaseUrl();

    webview.onDidReceiveMessage(async ({ command, value }) => {
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
        case "httpRequest":
          const response = await axios.request({
            baseURL: this.baseUrl,
            url: value.url,
            method: value.method,
            data: value.body,
            headers: JSON.parse(value.headers || {}),
            responseType: "text",
            transformResponse: (data) => {
              return data;
            }
          });

          webview.postMessage({
            command: "httpResponse",
            value: {
              id: value.id,
              body: response.data,
              status: response.status,
              statusText: response.statusText,
              headers: JSON.stringify(response.headers || {})
            }
          });
          break;

        case "navigateCode":
          const file = fileNameToUri(gist.id, value.file);
          const editor = vscode.window.visibleTextEditors.find(
            (editor) => editor.document.uri.toString() === file.toString()
          );

          const line = value.line - 1;
          const column = value.column - 1;
          const range = new vscode.Range(line, column, line, 1000);

          if (editor) {
            editor.selection = new vscode.Selection(range.start, range.end);
          } else {
            vscode.commands.executeCommand("vscode.open", file, {
              selection: range,
              preserveFocus: true
            });
          }

          break;
      }
    });

    reaction(
      () => [this.gist.updated_at],
      () => {
        this.updateBaseUrl();
        this.rebuildWebview();
      }
    );
  }

  public updateCSS(css: string, rebuild = false) {
    this.css = css;

    if (rebuild) {
      this.webview.postMessage({ command: "updateCSS", value: css });
    }
  }

  public async updateReadme(readme: string, rebuild = false) {
    this.readme = readme;

    if (rebuild) {
      await this.rebuildWebview();
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
    const data = getScriptContent(textDocument, this.manifest);
    if (data === null) {
      return;
    }

    this.javascript = data[0];
    this.isJavaScriptModule = data[1];

    if (rebuild) {
      await this.rebuildWebview();
    }
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

  private async resolveLibraries(libraryType: PlaygroundLibraryType) {
    let libraries =
      libraryType === PlaygroundLibraryType.script
        ? this.codePenScripts
        : this.codePenStyles;

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
            libraries += `<link href="${url}" rel="stylesheet" />`;
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
    const styleId = `gistpad-playground-style-${Math.random()}`;

    const scripts = await this.resolveLibraries(PlaygroundLibraryType.script);
    const styles = await this.resolveLibraries(PlaygroundLibraryType.style);

    const scriptType = this.isJavaScriptModule
      ? "module"
      : this.manifest && this.manifest.scriptType
      ? this.manifest.scriptType
      : "text/javascript";

    const readmeBehavior =
      (this.manifest && this.manifest.readmeBehavior) ||
      (await config.get("playgrounds.readmeBehavior"));

    const header = readmeBehavior === "previewHeader" ? this.readme : "";
    const footer = readmeBehavior === "previewFooter" ? this.readme : "";

    this.webview.html = `<html>
  <head>
    <base href="${this.baseUrl}" />
    <style>

      body {
        background-color: white;
        font-size: var(---vscode-font-size);
      }

    </style>
    ${styles}
    <style id="${styleId}">
      ${this.css}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/mock-xmlhttprequest@5.1.0/dist/mock-xmlhttprequest.min.js"></script>
    <script>

    // Wrap this code in braces, so that none of the variables
    // conflict with variables created by a playground's scripts.
    {
      document.getElementById("_defaultStyles").remove();

      const vscode = acquireVsCodeApi();
      const style = document.getElementById("${styleId}");
  
      let httpRequestId = 1;
      const pendingHttpRequests = new Map();

      window.addEventListener("message", ({ data }) => {  
        if (data.command === "updateCSS") {
          style.textContent = data.value;
        } else if (data.command === "httpResponse") {
          const xhr = pendingHttpRequests.get(data.value.id);
          xhr.respond(data.value.status, JSON.parse(data.value.headers), data.value.body, data.value.statusText);
          pendingHttpRequests.delete(data.value.id);
        }
      });
    
      function serializeMessage(message) {
        if (typeof message === "string") {
          return message
        } else {
          return JSON.stringify(message);
        }
      }

      window.alert = (message) => {
        const value = serializeMessage(message);
        vscode.postMessage({
          command: "alert",
          value
        });
      };

      console.clear = () => {
        vscode.postMessage({
          command: "clear",
          value: ""
        });
      };

      const originalLog = console.log;
      console.log = (message, ...args) => {
        const value = serializeMessage(message);
        vscode.postMessage({
          command: "log",
          value
        });
        
        originalLog.call(console, message, ...args);
      };

      const mockXHRServer = MockXMLHttpRequest.newServer();
      mockXHRServer.setDefaultHandler((xhr) => {
        pendingHttpRequests.set(httpRequestId, xhr);
        vscode.postMessage({
          command: "httpRequest",
          value: {
            id: httpRequestId++,
            url: xhr.url,
            method: xhr.method,
            body: xhr.body,
            headers: JSON.stringify(xhr.headers || {})
          }
        });
      });
      mockXHRServer.install(window);

      const LINK_PREFIX = "gist:";
      document.addEventListener("click", (e) => {
        if (e.target.href && e.target.href.startsWith(LINK_PREFIX)) {
          e.preventDefault();

          const href = e.target.href.replace(LINK_PREFIX, "");
          const [file, lineColumn] = href.split("@");
          const [line, column] = lineColumn ? lineColumn.split(":") : [];

          vscode.postMessage({
            command: "navigateCode",
            value: {
              file, 
              line: Number(line) || 1,
              column: Number(column) || 1
            }
          });
        }
      });
    }

    </script>
    ${scripts}
  </head>
  <body>
    ${header}
    ${this.html}
    ${footer}
    <script type="${scriptType}">
      ${this.javascript}
    </script>
  </body>
</html>`;
  }
}
