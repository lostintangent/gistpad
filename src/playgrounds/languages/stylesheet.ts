import * as path from "path";
import { TextDocument } from "vscode";
import * as config from "../../config";
import { byteArrayToString } from "../../utils";

export const STYLESHEET_BASE_NAME = "style";

const StylesheetLanguage = {
  css: ".css",
  less: ".less",
  sass: ".sass",
  scss: ".scss"
};

export const STYLESHEET_EXTENSIONS = [
  StylesheetLanguage.css,
  StylesheetLanguage.less,
  StylesheetLanguage.sass,
  StylesheetLanguage.scss
];

export async function getNewStylesheetFilename() {
  const stylesheetLanguage = config.get("playgrounds.stylesheetLanguage");
  return `${STYLESHEET_BASE_NAME}${StylesheetLanguage[stylesheetLanguage]}`;
}

export async function getStylesheetContent(
  document: TextDocument
): Promise<string | null> {
  let content = document.getText();
  if (content.trim() === "") {
    return content;
  }

  const extension = path.extname(document.uri.toString()).toLocaleLowerCase();
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
}
