import axios from "axios";
import { log } from "../logger";

export const LIBRARIES_URL = "https://api.cdnjs.com/libraries";

export interface ICDNJSLibrary {
  name: string;
  latest: string;
}
export interface ICDNJSLibrarayVersion {
  version: string;
  files: string[];
}

export interface ICDNJSLibrarayManifest {
  name: string;
  description: string;
  filename: string;
  assets: ICDNJSLibrarayVersion[];
}

let libraries: ICDNJSLibrary[] | undefined;

const getLibrariesInternal = async (): Promise<ICDNJSLibrary[]> => {
  try {
    const librariesResponse = await axios.get<{ results: ICDNJSLibrary[] }>(
      LIBRARIES_URL,
      {
        responseType: "json"
      }
    );

    libraries = librariesResponse.data.results;

    return libraries;
  } catch (e) {
    throw new Error("Cannot get the libraries.");
  }
};

let currentGetLibrariesPromise: Promise<ICDNJSLibrary[]> | undefined;
export const getCDNJSLibraries = async () => {
  if (libraries) {
    return libraries;
  }

  if (currentGetLibrariesPromise) {
    return await currentGetLibrariesPromise;
  }

  currentGetLibrariesPromise = getLibrariesInternal();

  return await currentGetLibrariesPromise;
};

export const getLibraryVersions = async (libraryName: string) => {
  try {
    const libraries = await axios.get<ICDNJSLibrarayManifest>(
      `${LIBRARIES_URL}/${libraryName}`,
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
