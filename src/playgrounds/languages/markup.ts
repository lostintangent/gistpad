import * as path from "path";
import { TextDocument } from "vscode";
import * as config from "../../config";

export const MARKUP_BASE_NAME = "index";

export const MarkupLanguage = {
  html: ".html",
  markdown: ".md",
  pug: ".pug"
};

export const MARKUP_EXTENSIONS = [
  MarkupLanguage.html,
  MarkupLanguage.markdown,
  MarkupLanguage.pug
];

export async function getNewMarkupFilename() {
  const markupLanguage = await config.get("playgrounds.markupLanguage");
  return `${MARKUP_BASE_NAME}${MarkupLanguage[markupLanguage]}`;
}

export function getMarkupContent(document: TextDocument): string | null {
  const content = document.getText();
  if (content.trim() === "") {
    return content;
  }

  const extension = path.extname(document.uri.toString()).toLocaleLowerCase();

  try {
    if (extension === MarkupLanguage.pug) {
      const pug = require("pug");
      return pug.render(content);
    } else if (extension === MarkupLanguage.markdown) {
      const markdown = require("markdown-it")();
      return markdown.render(content);
    } else {
      return content;
    }
  } catch {
    return null;
  }
}
