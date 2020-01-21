import * as path from "path";
import * as vscode from "vscode";
import { byteArrayToString } from "../byteArrayToString";
import { EXTENSION_NAME, PLAYGROUND_FILE, URI_PATTERN } from "../constants";
import { PlaygroundFileType } from "../interfaces/PlaygroundTypes";
import { Gist } from "../store";
import { GistNode } from "../tree/nodes";
import { fileNameToUri, stringToByteArray } from "../utils";
import { getCDNJSLibraries } from "./cdnjs";
import { getGistFileOfType } from "./playground";

const CODEPEN_URI = "https://vsls-contrib.github.io/gistpad/codepen.html";
const MARKER_FILE = ".codepen";

const SCRIPT_PATTERN = /<script src="(?<url>[^"]+)"><\/script>/gi;
const STYLE_PATTERN = /<link href="(?<url>[^"]+)" rel="stylesheet" \/>/gi;

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
  tags: string[];
}

function matchAllUrls(string: string, regex: RegExp): string[] {
  let match;
  let results = [];
  while ((match = regex.exec(string)) !== null) {
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }

    results.push(match!.groups!.url);
  }
  return results;
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
          return "";
        }

        return libraryEntry.latest;
      }
    })
  );
}

async function exportGist(gist: Gist) {
  const data: PenDefinition = {
    title: gist.description,
    description: gist.description,
    tags: ["gistpad"]
  };

  const markupFile = getGistFileOfType(gist, PlaygroundFileType.markup);
  const scriptFile = getGistFileOfType(gist, PlaygroundFileType.script);
  const stylesheetFile = getGistFileOfType(gist, PlaygroundFileType.stylesheet);

  if (markupFile) {
    data.html = byteArrayToString(
      await vscode.workspace.fs.readFile(fileNameToUri(gist.id, markupFile))
    );
    data.html_pre_processor = markupFile.endsWith(".pug") ? "pug" : "none";
  }

  if (scriptFile) {
    data.js = byteArrayToString(
      await vscode.workspace.fs.readFile(fileNameToUri(gist.id, scriptFile))
    );

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
    data.css = byteArrayToString(
      await vscode.workspace.fs.readFile(fileNameToUri(gist.id, stylesheetFile))
    );
    switch (path.extname(stylesheetFile)) {
      case ".scss":
        data.css_pre_processor = "scss";
        break;
      case ".sass":
        data.css_pre_processor = "sass";
        break;
      case ".less":
        data.css_pre_processor = "less";
        break;
      default:
        data.css_pre_processor = "none";
        break;
    }
  }

  let scripts: string[] = [];
  let styles: string[] = [];

  if (Object.keys(gist.files).includes("scripts")) {
    const scriptsContent = byteArrayToString(
      await vscode.workspace.fs.readFile(fileNameToUri(gist.id, "scripts"))
    );

    scripts = matchAllUrls(scriptsContent, SCRIPT_PATTERN);
  }

  if (Object.keys(gist.files).includes("styles")) {
    const stylesContent = byteArrayToString(
      await vscode.workspace.fs.readFile(fileNameToUri(gist.id, "styles"))
    );

    styles = matchAllUrls(stylesContent, STYLE_PATTERN);
  }

  if (Object.keys(gist.files).includes(PLAYGROUND_FILE)) {
    const manifestContent = byteArrayToString(
      await vscode.workspace.fs.readFile(
        fileNameToUri(gist.id, PLAYGROUND_FILE)
      )
    );

    if (manifestContent) {
      let manifest;
      try {
        manifest = JSON.parse(manifestContent);
      } catch (e) {
        throw new Error(
          "The gist's manifest file appears to be invalid. Please check it and try again."
        );
      }
      if (manifest.scripts && manifest.scripts.length > 0) {
        if (
          manifest.scripts.find((script: any) => script === "react") &&
          data.js_pre_processor === "none"
        ) {
          data.js_pre_processor = "babel";
        }

        scripts = scripts.concat(await resolveLibraries(manifest.scripts));
      }

      if (manifest.styles && manifest.styles.length > 0) {
        styles = styles.concat(await resolveLibraries(manifest.styles));
      }
    }
  }

  if (scripts.length > 0) {
    data.js_external = scripts.join(";");
  }

  if (styles.length > 0) {
    data.css_external = styles.join(";");
  }

  await vscode.workspace.fs.writeFile(
    fileNameToUri(gist.id, MARKER_FILE),
    stringToByteArray(JSON.stringify(data))
  );

  // Grab the updated raw URL, which will include
  // the latest commit ID after adding the marker file.
  // This is neccessary for "busting" the cache, when the
  // CodePen export page tries to download the marker file.
  const definitionUrl = encodeURIComponent(gist.files[MARKER_FILE].raw_url!);

  await vscode.env.openExternal(
    vscode.Uri.parse(`${CODEPEN_URI}?pen=${definitionUrl}`)
  );

  // Return a function that when called,
  // will delete the temporary marker file.
  return () => {
    vscode.workspace.fs.delete(fileNameToUri(gist.id, MARKER_FILE));
  };
}

export function registerCodePenCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.exportGistToCodePen`,
      async (node: GistNode) => {
        const cleanup = await vscode.window.withProgress(
          {
            title: "Exporting playground...",
            location: vscode.ProgressLocation.Notification
          },
          () => exportGist(node.gist)
        );

        setTimeout(cleanup, 5000);
      }
    )
  );
}
