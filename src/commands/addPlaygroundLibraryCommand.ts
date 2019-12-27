import * as vscode from "vscode";
import { IPlaygroundJSON } from "../interfaces/IPlaygroundJSON";
import { GistNode } from "../tree/nodes";
import { fileNameToUri } from "../utils";
import {
  getCDNJSLibraries,
  getLibraryVersions,
  ICDNJSLibrarayVersion,
  ICDNJSLibrary
} from "./cdnjs";
import { activePlayground } from "./playground";

const SUPPORTED_DEFAULT_LIBRARIES = [
  "angular.js",
  "d3",
  "ember.js",
  "jquery",
  "react",
  "react-dom",
  "redux",
  "mobx",
  "polymer",
  "vue"
];

const librariesToPickList = (libraries: ICDNJSLibrary[]) => {
  return libraries.map((library) => {
    return {
      label: library.name,
      description: library.description,
      library
    };
  });
};

const libraryVersionsToPickList = (versions: ICDNJSLibrarayVersion[]) => {
  return versions.map((version) => {
    return {
      label: version.version,
      version
    };
  });
};

const libraryToVersionsPickList = async (libraryName: string) => {
  const versions = await getLibraryVersions(libraryName);
  return libraryVersionsToPickList(versions);
};

const libraryFilesToPickList = (files: string[]) => {
  return files.map((file) => {
    return {
      label: file
    };
  });
};

const createLibraryUrl = (
  libraryName: string,
  libraryVersion: string,
  libraryFile: string
) => {
  return `https://cdnjs.cloudflare.com/ajax/libs/${libraryName}/${libraryVersion}/${libraryFile}`;
};

const filterOutCommonJsFiles = (versions: string[]) => {
  const result = versions.filter((file: string) => {
    return !file.startsWith("cjs");
  });

  return result;
};

export const defaultPlaygroundJSON = {
  libraries: [] as string[]
};

export const getPlaygroundJson = (text: string): IPlaygroundJSON => {
  try {
    const json = JSON.parse(text) as IPlaygroundJSON;

    return {
      ...defaultPlaygroundJSON,
      ...json
    };
  } catch {
    return defaultPlaygroundJSON;
  }
};

const addDependencyLink = async (
  libraryUrl: string,
  node?: GistNode | vscode.Uri
) => {
  if (node && node instanceof GistNode) {
    const uri = fileNameToUri(node.gist.id, "playground.json");

    let playgroundJSON;
    try {
      const content = (await vscode.workspace.fs.readFile(uri)).toString();
      playgroundJSON = getPlaygroundJson(content);
    } catch (e) {
      playgroundJSON = defaultPlaygroundJSON;
    }

    playgroundJSON.libraries.push(libraryUrl);
    playgroundJSON.libraries = [...new Set(playgroundJSON.libraries)];

    const updatedContent = JSON.stringify(playgroundJSON, null, 2);
    vscode.workspace.fs.writeFile(uri, Buffer.from(updatedContent));

    if (activePlayground && activePlayground.gistId === node.gist.id) {
      activePlayground.webView.updateManifest(updatedContent, true);
    }
    return;
  } else if (vscode.window.activeTextEditor) {
    await vscode.window.activeTextEditor.edit(async (edit) => {
      const { document } = vscode.window.activeTextEditor!;
      const text = document.getText();
      const playgroundJSON = getPlaygroundJson(text);

      playgroundJSON.libraries.push(libraryUrl);
      playgroundJSON.libraries = [...new Set(playgroundJSON.libraries)];

      const range = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length)
      );

      edit.replace(range, JSON.stringify(playgroundJSON, null, 2));
    });
  }
};

const createLatestUrl = (libraryAnswer: any) => {
  const { name, latest } = libraryAnswer.library;
  return SUPPORTED_DEFAULT_LIBRARIES.indexOf(name) > -1 ? name : latest;
};

export const addPlaygroundLibraryCommand = async (
  nodeOrUri?: GistNode | vscode.Uri
) => {
  const libraries = await getCDNJSLibraries();

  const libraryAnswer = await vscode.window.showQuickPick(
    librariesToPickList(libraries),
    {
      placeHolder: "Select the library you'd like to add to the playground"
    }
  );

  if (!libraryAnswer) {
    return;
  }

  const libraryVersionAnswer = await vscode.window.showQuickPick(
    await libraryToVersionsPickList(libraryAnswer.label),
    {
      placeHolder: "Select the library version you'd like to use"
    }
  );

  if (!libraryVersionAnswer) {
    return;
  }

  const libraryFiles = filterOutCommonJsFiles(
    libraryVersionAnswer.version.files
  );

  const fileAnswer =
    libraryFiles.length > 1
      ? await vscode.window.showQuickPick(
          await libraryFilesToPickList(libraryFiles),
          {
            placeHolder: "Select file version"
          }
        )
      : { label: libraryFiles[0] };

  if (!fileAnswer) {
    return;
  }

  const libraryUrl =
    libraryVersionAnswer.label === "latest"
      ? createLatestUrl(libraryAnswer)
      : createLibraryUrl(
          libraryAnswer.library.name,
          libraryVersionAnswer.label,
          fileAnswer.label
        );

  await addDependencyLink(libraryUrl, nodeOrUri);
};
