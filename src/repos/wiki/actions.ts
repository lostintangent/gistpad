import { runInAction } from "mobx";
import { Location, Range, Uri, workspace } from "vscode";
import { byteArrayToString } from "../../utils";
import { RepoFileSystemProvider } from "../fileSystem";
import { Repository, Tree, TreeItem } from "../store";
import { getRepoFile } from "../store/actions";
import { findLinks, getTreeItemFromLink, isWiki } from "./utils";

async function getBackLinks(uri: Uri, contents: string) {
  const documentLinks = [...findLinks(contents)];
  return Promise.all(
    documentLinks.map(async ({ title, contentStart, contentEnd }) => {
      const document = await workspace.openTextDocument(uri);
      const start = document.positionAt(contentStart);
      const end = document.positionAt(contentEnd);

      return {
        title,
        linePreview: document.lineAt(start).text,
        location: new Location(uri, new Range(start, end))
      };
    })
  );
}

export async function updateTree(repo: Repository, tree: Tree) {
  if (!isWiki(repo, tree)) {
    repo.tree = tree;
    return;
  }

  const markdownFiles = tree.tree.filter((treeItem) =>
    treeItem.path.endsWith(".md")
  );

  const documents = await Promise.all(
    markdownFiles.map(
      async (treeItem): Promise<TreeItem> => {
        const contents = byteArrayToString(
          await getRepoFile(repo.name, treeItem.sha)
        );
        treeItem.contents = contents;

        const match = contents!.match(/^(?:#+\s*)(.+)$/m);
        const displayName = match ? match[1].trim() : undefined;
        treeItem.displayName = displayName;

        return treeItem;
      }
    )
  );

  repo.tree = tree;
  repo.isLoading = false;

  for (let { path, contents } of documents) {
    const uri = RepoFileSystemProvider.getFileUri(repo.name, path);
    const links = await getBackLinks(uri, contents!);
    for (const link of links) {
      const item = getTreeItemFromLink(repo, link.title);
      if (item) {
        const entry = documents.find((doc) => doc.path === item.path)!;
        if (entry.backLinks) {
          entry.backLinks.push(link);
        } else {
          entry.backLinks = [link];
        }
      }
    }
  }

  runInAction(() => {
    for (let { path, backLinks } of documents) {
      const item = repo.tree?.tree.find((item) => item.path === path);
      item!.backLinks = backLinks;
    }
  });
}
