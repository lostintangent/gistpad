import * as path from "path";
import { TextDocument } from "vscode";
import * as config from "../../config";
import { compileCode, getExtensions } from "./languageProvider";

export const MARKUP_BASE_NAME = "index";

const MarkupLanguage = {
  html: ".html",
  markdown: ".md",
  pug: ".pug"
};

const MARKUP_EXTENSIONS = [
  MarkupLanguage.html,
  MarkupLanguage.markdown,
  MarkupLanguage.pug
];

export function getCandidateMarkupFilenames() {
  return getMarkupExtensions().map(
    (extension) => `${MARKUP_BASE_NAME}${extension}`
  );
}

export function getMarkupExtensions() {
  const customExtensions = getExtensions("markup");
  return [...MARKUP_EXTENSIONS, ...customExtensions];
}

export async function getNewMarkupFilename() {
  const markupLanguage = await config.get("playgrounds.markupLanguage");
  return `${MARKUP_BASE_NAME}${MarkupLanguage[markupLanguage]}`;
}

export async function getMarkupContent(
  document: TextDocument
): Promise<string | null> {
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
    } else if (extension === MarkupLanguage.html) {
      return content;
    } else {
      return await compileCode("markup", extension, content);
    }
  } catch {
    return null;
  }
}
