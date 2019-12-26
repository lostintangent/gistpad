import * as vscode from "vscode";
import { IPlaygroundJSON } from "../interfaces/IPlaygroundJSON";
import {
  getCDNJSLibraries,
  getLibraryVersions,
  ICDNJSLibrarayVersion,
  ICDNJSLibrary
} from "./cdnjs";

const SUPPORTED_DEFAULT_LIBRARIES = [
  "react",
  "react-dom",
  "vue",
  "angular",
  "redux",
  "mobx",
  "jquery",
  "backone",
  "ember",
  "polymer",
  "mithril",
  "aurelia"
];

const librariesToPickerList = (libraries: ICDNJSLibrary[]) => {
  const result = libraries.map((library) => {
    return {
      label: library.name,
      description: library.description,
      library
    };
  });

  return result;
};

const libraryVersionsToPickerOptions = (versions: ICDNJSLibrarayVersion[]) => {
  const result = versions.map((version) => {
    return {
      label: version.version,
      version
    };
  });

  return result;
};

const libraryToVersionsPickerList = async (libraryName: string) => {
  const versions = await getLibraryVersions(libraryName);

  return libraryVersionsToPickerOptions(versions);
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

const libraryFilesToPickerOptions = (files: string[]) => {
  const result = files.map((file) => {
    return {
      label: file
    };
  });

  return result;
};

export const defaultPlaygroundJSON = {
  libraries: [] as string[]
} as const;

export const getPlaygroundJson = (text: string): IPlaygroundJSON => {
  try {
    const json = JSON.parse(text) as IPlaygroundJSON;

    return {
      ...defaultPlaygroundJSON,
      ...json
    };
  } catch {
    return { ...defaultPlaygroundJSON };
  }
};

const addDependencyLink = async (libraryName: string, libraryUrl: string) => {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    throw new Error("No active text editor to paste the image.");
  }

  await editor.edit(async (edit) => {
    const { document } = editor;
    const text = document.getText();

    const playgroundJSON = getPlaygroundJson(text);

    playgroundJSON.libraries.push(libraryUrl);
    playgroundJSON.libraries = [...new Set(playgroundJSON.libraries)];

    const startPos = document.positionAt(0);
    const endPos = document.positionAt(text.length);
    const range = new vscode.Selection(startPos, endPos);

    edit.replace(range, JSON.stringify(playgroundJSON, null, 2));
  });
};

const createLatestUrl = (libraryNameAnswer: any) => {
  const { name, latest } = libraryNameAnswer.library;

  const result = SUPPORTED_DEFAULT_LIBRARIES.indexOf(name) > -1 ? name : latest;

  return result;
};

export const addPlaygroundLibraryCommand = async () => {
  const libraries = await getCDNJSLibraries();

  const libraryNameAnswer = await vscode.window.showQuickPick(
    librariesToPickerList(libraries),
    {
      placeHolder: "Select a library to add"
    }
  );

  if (!libraryNameAnswer) {
    throw new Error("No library selected.");
  }

  const libraryVersionAnswer = await vscode.window.showQuickPick(
    await libraryToVersionsPickerList(libraryNameAnswer.label),
    {
      placeHolder: "Select library version"
    }
  );

  if (!libraryVersionAnswer) {
    throw new Error("No library version selected.");
  }

  const libraryFiles = filterOutCommonJsFiles(
    libraryVersionAnswer.version.files
  );

  const fileAnswer =
    libraryFiles.length > 1
      ? await vscode.window.showQuickPick(
          await libraryFilesToPickerOptions(libraryFiles),
          {
            placeHolder: "Select file version"
          }
        )
      : { label: libraryFiles[0] };

  if (!fileAnswer) {
    throw new Error("No library file selected.");
  }

  const libraryUrl =
    libraryVersionAnswer.label === "latest"
      ? createLatestUrl(libraryNameAnswer)
      : createLibraryUrl(
          libraryNameAnswer.library.name,
          libraryVersionAnswer.label,
          fileAnswer.label
        );

  await addDependencyLink(libraryNameAnswer.label, libraryUrl);
};
