import axios from "axios";
import * as vscode from "vscode";
import { IPlaygroundJSON } from "../interfaces/IPlaygroundJSON";
import { log } from "../logger";

const LIBRARIES_URL = "https://api.cdnjs.com/libraries";

interface ICDNJSLibrary {
  name: string;
  latest: string;
}

const getLibraries = async () => {
  try {
    const libraries = await axios.get<{ results: ICDNJSLibrary[] }>(
      LIBRARIES_URL,
      {
        responseType: "json"
      }
    );

    return libraries.data.results;
  } catch (e) {
    throw new Error("Cannot get the libraries.");
  }
};

const librariesToPickerList = (libraries: ICDNJSLibrary[]) => {
  const result = libraries.map((library) => {
    return {
      label: library.name,
      library
    };
  });

  return result;
};

interface ICDNJSLibrarayVersion {
  version: string;
  files: string[];
}

interface ICDNJSLibrarayManifest {
  name: string;
  description: string;
  filename: string;
  assets: ICDNJSLibrarayVersion[];
}

const getLibraryVersions = async (libraryName: string) => {
  try {
    const libraries = await axios.get<ICDNJSLibrarayManifest>(
      `https://api.cdnjs.com/libraries/${libraryName}`,
      {
        responseType: "json"
      }
    );

    const packageManifest = libraries.data;

    return [
      {
        version: "latest",
        files: [packageManifest.filename]
      },
      ...packageManifest.assets
    ];
  } catch (e) {
    log.error(e);

    return [];
  }
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

const defaultPlaygroundJSON = {
  dependencies: {}
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

    playgroundJSON.dependencies[libraryName] = libraryUrl;

    const startPos = document.positionAt(0);
    const endPos = document.positionAt(text.length);
    const range = new vscode.Selection(startPos, endPos);

    edit.replace(range, JSON.stringify(playgroundJSON, null, 2));
  });
};

export const addPlaygroundDependecyCommand = async () => {
  const libraries = await getLibraries();

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
      ? libraryNameAnswer.library.latest
      : createLibraryUrl(
          libraryNameAnswer.library.name,
          libraryVersionAnswer.label,
          fileAnswer.label
        );

  await addDependencyLink(libraryNameAnswer.label, libraryUrl);
};
