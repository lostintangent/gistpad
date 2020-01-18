import * as EventEmitter from "eventemitter3";
import { getCDNJSLibraries } from "../commands/cdnjs";
import { PlaygroundLibraryType } from "../commands/playground";
import { CSS_ELEMENT_ID, URI_PATTERN } from "../constants";
import { IPlaygroundManifest } from "../interfaces/IPlaygroundManifest";
import { log } from "../logger";
import { Gist } from "../store";
import { transpileCss } from "./transpilers/cssTranspiler";
import { htmlTranspiler } from "./transpilers/htmlTranspiler";
import { transpileJs } from "./transpilers/jsTranspiler";

export class RenderHtml {
  public baseUrl: string = "";
  private html: string = "";
  private css: string = "";
  private js: string = "";
  private manifest: IPlaygroundManifest = {};

  public on: (
    event: string,
    fn: (
      type: "html" | "js" | "css" | "manifest" | "baseUrl",
      content: string
    ) => void
  ) => void;

  private emitter = new EventEmitter();

  constructor(
    private gist: Gist,
    private additionalHeadContent: string = "",
    private codePenScripts: string = "",
    private codePenStyles: string = ""
  ) {
    this.on = this.emitter.on.bind(this.emitter);
    this.setBaseUrl();
  }

  public setBaseUrl = async () => {
    const owner = this.gist.owner ? this.gist.owner.login : "anonymous";
    this.baseUrl = `https://gist.githack.com/${owner}/${this.gist.id}/raw/${this.gist.history[0].version}/`;

    this.emitter.emit("change", "baseUrl", this.baseUrl);
  };

  public setHtml = async (
    fileName: string,
    content: string,
    isTriggerChangeEvent = false
  ) => {
    this.html = await htmlTranspiler({ fileName, content }, this.manifest);

    if (isTriggerChangeEvent) {
      this.emitter.emit("change", "html", this.html);
    }
  };

  public setCss = async (
    fileName: string,
    content: string,
    isTriggerChangeEvent = false
  ) => {
    this.css = await transpileCss({ fileName, content }, this.manifest);

    if (isTriggerChangeEvent) {
      this.emitter.emit("change", "css", this.css);
    }
  };

  public setJs = async (
    fileName: string,
    content: string,
    isTriggerChangeEvent = false
  ) => {
    this.js = await transpileJs({ fileName, content }, this.manifest);
    if (isTriggerChangeEvent) {
      this.emitter.emit("change", "js", this.js);
    }
  };

  public setManifest = async (
    manifest: string,
    isTriggerChangeEvent: boolean = false
  ) => {
    if (!manifest) {
      return;
    }

    try {
      this.manifest = JSON.parse(manifest);

      if (isTriggerChangeEvent) {
        this.emitter.emit("change", "manifest", this.manifest);
      }
    } catch (e) {
      // The user might have typed invalid JSON
      log.error(e);
    }
  };

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

  public render = async () => {
    const scripts = await this.resolveLibraries(PlaygroundLibraryType.script);
    const styles = await this.resolveLibraries(PlaygroundLibraryType.style);

    const scriptType =
      this.manifest && this.manifest.scriptType
        ? this.manifest.scriptType
        : "text/javascript";

    return `
    <html>
      <head>
        <base href="${this.baseUrl}" />
        <style>
          body { background-color: white; }
        </style>
        ${styles}
        <style id="${CSS_ELEMENT_ID}">
          ${this.css}
        </style>
        ${this.additionalHeadContent}
      </head>
      <body>
        ${this.html}
        ${scripts}
        <script type="${scriptType}">
          ${this.js}
        </script>
      </body>
    </html>
    `;
  };
}
