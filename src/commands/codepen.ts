import * as path from "path";
import * as vscode from "vscode";
import { EXTENSION_ID, URI_PATTERN } from "../constants";
import { GistNode } from "../tree/nodes";
import { fileNameToUri } from "../utils";
import { getCDNJSLibraries } from "./cdnjs";
import { getGistFileOfType, PlaygroundFileType } from "./playground";

const CODEPEN_URI = "https://vsls-contrib.github.io/gistpad/codepen.html";

interface PenDefinition {
  title: string;
  description: string;
  html?: string;
  html_pre_processor?: string;
  css?: string;
  css_pre_processor?: string;
  js?: string;
  js_pre_processor?: string;
  css_external?: string;
  js_external?: string;
}

function resolveLibraries(libraries: string[]) {
  return Promise.all(
    libraries.map(async (library: string) => {
      const isUrl = library.match(URI_PATTERN);
      if (isUrl) {
        return library;
      } else {
        const libraries = await getCDNJSLibraries();
        const libraryEntry = libraries.find((lib) => lib.name === library);

        if (!libraryEntry) {
          return;
        }

        return libraryEntry.latest;
      }
    })
  );
}

export function registerCodePenCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_ID}.openGistInCodePen`,
      async function sendToCodePen(node: GistNode) {
        const gist = node.gist;

        const data: PenDefinition = {
          title: gist.description,
          description: gist.description
        };

        const markupFile = getGistFileOfType(gist, PlaygroundFileType.markup);
        const scriptFile = getGistFileOfType(gist, PlaygroundFileType.script);
        const stylesheetFile = getGistFileOfType(
          gist,
          PlaygroundFileType.stylesheet
        );

        if (markupFile) {
          data.html = (
            await vscode.workspace.fs.readFile(
              fileNameToUri(gist.id, markupFile)
            )
          ).toString();
          data.html_pre_processor = markupFile.endsWith(".pug")
            ? "pug"
            : "none";
        }

        if (scriptFile) {
          data.js = (
            await vscode.workspace.fs.readFile(
              fileNameToUri(gist.id, scriptFile)
            )
          ).toString();

          const extension = path.extname(scriptFile);
          switch (extension) {
            case ".babel":
            case ".jsx":
              data.js_pre_processor = "babel";
              break;
            case ".ts":
            case ".tsx":
              data.js_pre_processor = "typescript";
              break;
            default:
              data.js_pre_processor = "none";
          }
        }

        if (stylesheetFile) {
          data.css = (
            await vscode.workspace.fs.readFile(
              fileNameToUri(gist.id, stylesheetFile)
            )
          ).toString();
          data.css_pre_processor = stylesheetFile.endsWith("scss")
            ? "scss"
            : "none";
        }

        if (Object.keys(gist.files).includes("playground.json")) {
          const manifestContent = (
            await vscode.workspace.fs.readFile(
              fileNameToUri(gist.id, "playground.json")
            )
          ).toString();

          if (manifestContent) {
            const manifest = JSON.parse(manifestContent);
            if (manifest.scripts && manifest.scripts.length > 0) {
              if (
                manifest.scripts.find((script: any) => script === "react") &&
                data.js_pre_processor === "none"
              ) {
                data.js_pre_processor = "babel";
              }

              const scripts = await resolveLibraries(manifest.scripts);
              data.js_external = scripts.join(";");
            }

            if (manifest.styles && manifest.styles.length > 0) {
              const styles = await resolveLibraries(manifest.styles);
              data.css_external = styles.join(";");
            }
          }
        }

        const definition = encodeURIComponent(JSON.stringify(data));
        vscode.env.openExternal(
          vscode.Uri.parse(`${CODEPEN_URI}?pen=${definition}`)
        );
      }
    )
  );
}
