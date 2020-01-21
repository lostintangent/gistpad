import * as vscode from "vscode";
import { REACT_SCRIPTS } from "../commands/constants";
import { PLAYGROUND_FILE } from "../constants";
import { Gist } from "../store";
import { fileNameToUri, stringToByteArray } from "../utils";
import { includesReactFiles } from "./isReactFile";

const includesReactScripts = (scripts: string[]) => {
  return REACT_SCRIPTS.every((script) => scripts.includes(script));
};

export const getManifestContent = (gist: Gist) => {
  if (!gist.files[PLAYGROUND_FILE]) {
    return "";
  }

  const manifest = gist.files[PLAYGROUND_FILE].content!;
  if (includesReactFiles(gist)) {
    const parsedManifest = JSON.parse(manifest);
    if (!includesReactScripts(parsedManifest.scripts)) {
      parsedManifest.scripts.push(...REACT_SCRIPTS);
      parsedManifest.scripts = [...new Set(parsedManifest.scripts)];

      const content = JSON.stringify(parsedManifest, null, 2);

      (vscode.workspace as any).fs.writeFile(
        fileNameToUri(gist.id, PLAYGROUND_FILE),
        stringToByteArray(content)
      );

      return content;
    }
  }

  return manifest;
};
