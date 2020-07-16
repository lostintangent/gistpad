import { DocumentSelector } from "vscode";
import { RepoFileSystemProvider, REPO_SCHEME } from "../fileSystem";
import { Repository, Tree } from "../store";
import { sanitizeName } from "../utils";
import { config } from "./config";

export const LINK_SELECTOR: DocumentSelector = [
  {
    scheme: REPO_SCHEME,
    language: "markdown"
  }
];

export const LINK_PREFIX = "[[";
export const LINK_SUFFIX = "]]";
export const LINK_PATTERN = /(?:\[\[)([^\]]+)(?:\]\])/gi;

const WIKI_WORKSPACE_FILES = [
  "gistpad.json",
  ".vscode/gistpad.json",
  ".vscode/foam.json"
];

const DAILY_PATTERN = /\d{4}-\d{2}-\d{2}/;
export function getPageFilePath(name: string) {
  let fileName = sanitizeName(name).toLocaleLowerCase();
  if (!fileName.endsWith(".md")) {
    fileName += ".md";
  }

  if (DAILY_PATTERN.test(fileName)) {
    const pathPrefix = config.dailyDirectName
      ? `${config.dailyDirectName}/`
      : "";
    return `${pathPrefix}${fileName}`;
  } else {
    return fileName;
  }
}

export function* findLinks(contents: string): Generator<[string, number]> {
  let match;
  while ((match = LINK_PATTERN.exec(contents))) {
    yield [match[1], match.index];
  }
}

export function getTreeItemFromLink(repo: Repository, link: string) {
  return repo.tree!.tree.find(
    (item) =>
      item.displayName?.toLocaleLowerCase() === link.toLocaleLowerCase() ||
      item.path === link ||
      item.path.replace(".md", "") === link
  );
}

export function getUriFromLink(repo: Repository, link: string) {
  const treeItem = getTreeItemFromLink(repo, link);
  return RepoFileSystemProvider.getFileUri(repo.name, treeItem?.path);
}

export function isWiki(repo: Repository, tree?: Tree) {
  const repoTree = tree || repo.tree;
  return (
    repo.name.toLocaleLowerCase().includes("wiki") ||
    !!repoTree?.tree.some((item) => WIKI_WORKSPACE_FILES.includes(item.path))
  );
}
