import * as path from "path";
import { MarkupLanguage } from "../../commands/constants";
import { IPlaygroundManifest } from "../../interfaces/IPlaygroundManifest";
import { ITranspileFile } from "../../interfaces/ITranspileFile";

export const htmlTranspiler = async (
  file: ITranspileFile,
  manifest: IPlaygroundManifest
) => {
  const { content } = file;
  if (content.trim() === "") {
    return content;
  }

  const extension = path.extname(file.fileName).toLocaleLowerCase();
  if (extension === MarkupLanguage.pug) {
    const pug = require("pug");

    try {
      // Something failed when trying to transpile Pug,
      // so don't attempt to return anything
      return pug.render(content);
    } catch (e) {
      return null;
    }
  } else {
    return content;
  }
};
