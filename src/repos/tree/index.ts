import { reaction } from "mobx";
import {
  Event,
  EventEmitter,
  ExtensionContext,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  window
} from "vscode";
import { EXTENSION_NAME } from "../../constants";
import { Repository, RepositoryFile, store } from "../store";
import {
  RepositoryFileBackLinkNode,
  RepositoryFileNode,
  RepositoryNode
} from "./nodes";

class RepositoryTreeProvider implements TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new EventEmitter<void>();
  public readonly onDidChangeTreeData: Event<void> = this._onDidChangeTreeData
    .event;

  constructor(private context: ExtensionContext) {
    reaction(
      () => [
        store.repos.map((repo) => [
          repo.isLoading,
          repo.hasTours,
          repo.tree
            ? repo.tree.tree.map((item) => [
                item.path,
                item.displayName,
                item.backLinks
                  ? item.backLinks.map((link) => link.linePreview)
                  : null
              ])
            : null
        ])
      ],
      () => {
        this._onDidChangeTreeData.fire();
      }
    );
  }

  getBackLinkNodes(file: RepositoryFile, repo: Repository) {
    return file.backLinks?.map(
      (backLink) => new RepositoryFileBackLinkNode(repo.name, backLink)
    );
  }

  getFileNodes(parent: Repository | RepositoryFile, repo: Repository) {
    return parent.files?.map((file) => new RepositoryFileNode(repo, file));
  }

  getTreeItem = (node: TreeItem) => node;

  getChildren(element?: TreeItem): ProviderResult<TreeItem[]> {
    if (!element && store.repos.length > 0) {
      return store.repos
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((repo) => new RepositoryNode(repo, this.context));
    } else if (element instanceof RepositoryNode) {
      if (element.repo.isLoading) {
        return [new TreeItem("Loading repository...")];
      }

      const fileNodes = this.getFileNodes(element.repo, element.repo);
      if (fileNodes) {
        return fileNodes;
      } else {
        const addItemSuffix = element.repo.isWiki ? "page" : "file";
        const addFileItem = new TreeItem(`Add new ${addItemSuffix}`);

        const addItemCommand = element.repo.isWiki
          ? "addWikiPage"
          : "addRepositoryFile";

        addFileItem.command = {
          command: `${EXTENSION_NAME}.${addItemCommand}`,
          title: `Add new ${addItemSuffix}`,
          arguments: [element]
        };

        return [addFileItem];
      }
    } else if (element instanceof RepositoryFileNode) {
      if (element.file.isDirectory) {
        return this.getFileNodes(element.file, element.repo);
      } else if (element.file.backLinks) {
        return this.getBackLinkNodes(element.file, element.repo);
      }
    }
  }
}

export function registerTreeProvider(context: ExtensionContext) {
  window.createTreeView(`${EXTENSION_NAME}.repos`, {
    showCollapseAll: true,
    treeDataProvider: new RepositoryTreeProvider(context),
    canSelectMany: true
  });
}
