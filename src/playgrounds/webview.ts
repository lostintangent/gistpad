import axios from "axios";
import { reaction } from "mobx";
import * as vscode from "vscode";
import { Gist } from "../store";
import { RenderHtml } from "./renderHtml";
import { webviewControlScript } from "./webviewControlScript";

export class PlaygroundWebview {
  private renderHtml: RenderHtml;

  constructor(
    private webview: vscode.Webview,
    output: vscode.OutputChannel,
    private gist: Gist,
    codePenScripts: string = "",
    codePenStyles: string = ""
  ) {
    this.renderHtml = new RenderHtml(
      gist,
      webviewControlScript,
      codePenScripts,
      codePenStyles
    );

    this.renderHtml.on("change", (type, value) => {
      if (type === "css") {
        return this.webview.postMessage({ command: "updateCSS", value });
      }

      this.rebuildWebview();
    });

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
            baseURL: this.renderHtml.baseUrl,
            url: value.url,
            method: value.method,
            data: value.body,
            headers: JSON.parse(value.headers || {})
          });

          webview.postMessage({
            command: "httpResponse",
            value: {
              id: value.id,
              body: JSON.stringify(response.data),
              status: response.status,
              statusText: response.statusText,
              headers: JSON.stringify(response.headers || {})
            }
          });
          break;
      }
    });

    reaction(() => [this.gist.updated_at], this.renderHtml.setBaseUrl);
  }

  public updateCSS(textDocument: vscode.TextDocument, rebuild = false) {
    return this.renderHtml.setCss(
      textDocument.fileName,
      textDocument.getText(),
      rebuild
    );
  }

  public async updateHTML(textDocument: vscode.TextDocument, rebuild = false) {
    return this.renderHtml.setHtml(
      textDocument.fileName,
      textDocument.getText(),
      rebuild
    );
  }

  public async updateJavaScript(
    textDocument: vscode.TextDocument,
    rebuild = false
  ) {
    return await this.renderHtml.setJs(
      textDocument.fileName,
      textDocument.getText(),
      rebuild
    );
  }

  public async updateManifest(manifest: string, rebuild = false) {
    this.renderHtml.setManifest(manifest, rebuild);
  }

  public rebuildWebview = async () => {
    this.webview.html = await this.renderHtml.render();
  };
}
