import { runInAction } from "mobx";
import { Location, Range, Uri, workspace } from "vscode";
import { RepoFileSystemProvider } from "../fileSystem";
import { Repository, Tree, TreeItem } from "../store";
import { getRepoFile } from "../store/actions";
import { findLinks, getTreeItemFromLink, LINK_PREFIX } from "./utils";

async function getBackLinks(uri: Uri, contents: string) {
  const documentLinks = [...findLinks(contents)];
  return Promise.all(
    documentLinks.map(async ([file, index = 0]) => {
      const document = await workspace.openTextDocument(uri);
      const offset = index + LINK_PREFIX.length;
      const start = document.positionAt(offset);

      return {
        file,
        linePreview: document.lineAt(start).text,
        location: new Location(
          uri,
          new Range(start, document.positionAt(offset + file.length))
        )
      };
    })
  );
}

export async function updateTree(repo: Repository, tree: Tree) {
  if (!repo.isWiki) {
    repo.tree = tree;
    return;
  }

  const markdownFiles = tree.tree.filter((treeItem) =>
    treeItem.path.endsWith(".md")
  );

  const documents = await Promise.all(
    markdownFiles.map(
      async (treeItem): Promise<TreeItem> => {
        const contents = await getRepoFile(
          repo.name,
          repo.branch,
          treeItem.sha
        );
        treeItem.contents = contents;

        const match = contents!.match(/^(?:#\s*)(.+)$/m);
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
      const item = getTreeItemFromLink(repo, link.file);
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
