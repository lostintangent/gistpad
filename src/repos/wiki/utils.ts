import { RepoFileSystemProvider } from "../fileSystem";
import { Repository, Tree } from "../store";

export const LINK_SELECTOR = {
  scheme: RepoFileSystemProvider.SCHEME,
  language: "markdown"
};

export const LINK_PREFIX = "[[";
export const LINK_SUFFIX = "]]";
export const LINK_PATTERN = /(?:\[\[)([^\]]+)(?:\]\])/gi;

const WIKI_WORKSPACE_FILES = [
  "gistpad.json",
  ".vscode/gistpad.json",
  ".vscode/foam.json"
];

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
