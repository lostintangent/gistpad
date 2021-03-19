import { reaction } from "mobx";
import {
  Event,
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  TreeView,
  window
} from "vscode";
import { EXTENSION_NAME } from "../../constants";
import { store as authStore } from "../../store";
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

  constructor() {
    reaction(
      () => [
        authStore.isSignedIn,
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
    if (!element && authStore.isSignedIn && store.repos.length > 0) {
      return store.repos
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((repo) => new RepositoryNode(repo));
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

  getParent(element: TreeItem): TreeItem | undefined {
    return undefined;
  }
}

let treeView: TreeView<TreeItem>;

export function focusRepo(repo: Repository) {
  treeView.reveal(new RepositoryNode(repo));
}

export function registerTreeProvider() {
  treeView = window.createTreeView(`${EXTENSION_NAME}.repos`, {
    showCollapseAll: true,
    treeDataProvider: new RepositoryTreeProvider(),
    canSelectMany: true
  });
}
