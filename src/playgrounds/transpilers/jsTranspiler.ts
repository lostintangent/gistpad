import * as path from "path";
import {
  REACT_EXTENSIONS,
  TYPESCRIPT_EXTENSIONS
} from "../../commands/constants";
import { IPlaygroundManifest } from "../../interfaces/IPlaygroundManifest";
import { ITranspileFile } from "../../interfaces/ITranspileFile";

export const transpileJs = async (
  file: ITranspileFile,
  manifest: IPlaygroundManifest
) => {
  const { content } = file;
  if (content.trim() === "") {
    return content;
  }

  const extension = path.extname(file.fileName).toLocaleLowerCase();

  const includesJsx = !!(
    manifest.scripts && manifest.scripts.includes("react")
  );

  if (TYPESCRIPT_EXTENSIONS.includes(extension) || includesJsx) {
    const typescript = require("typescript");
    const compilerOptions: any = {
      experimentalDecorators: true,
      target: "ES2018"
    };

    if (includesJsx || REACT_EXTENSIONS.includes(extension)) {
      compilerOptions.jsx = typescript.JsxEmit.React;
    }

    try {
      return typescript.transpile(content, compilerOptions);
    } catch (e) {
      // Something failed when trying to transpile TypeScript,
      // so don't attempt to return anything
      return null;
    }
  } else {
    return content;
  }
};
