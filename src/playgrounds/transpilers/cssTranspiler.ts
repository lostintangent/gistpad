import * as path from "path";
import { byteArrayToString } from "../../byteArrayToString";
import { StylesheetLanguage } from "../../commands/constants";
import { IPlaygroundManifest } from "../../interfaces/IPlaygroundManifest";
import { ITranspileFile } from "../../interfaces/ITranspileFile";

export const transpileCss = async (
  file: ITranspileFile,
  manifest: IPlaygroundManifest
) => {
  const { content } = file;
  if (content.trim() === "") {
    return content;
  }

  const extension = path.extname(file.fileName).toLocaleLowerCase();
  if (
    extension === StylesheetLanguage.scss ||
    extension === StylesheetLanguage.sass
  ) {
    const sass = require("sass");

    try {
      return byteArrayToString(
        sass.renderSync({
          data: content,
          indentedSyntax: extension === StylesheetLanguage.sass
        }).css
      );
    } catch (e) {
      // Something failed when trying to transpile SCSS,
      // so don't attempt to return anything
      return null;
    }
  } else if (extension === StylesheetLanguage.less) {
    try {
      const less = require("less").default;
      const output = await less.render(content);
      return output.css;
    } catch (e) {
      return null;
    }
  } else {
    return content;
  }
};
