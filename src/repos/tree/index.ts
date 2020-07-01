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
import { RepositoryFileNode, RepositoryNode } from "./nodes";

class RepositoryTreeProvider implements TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new EventEmitter<TreeItem | void>();
  public readonly onDidChangeTreeData: Event<TreeItem | void> = this
    ._onDidChangeTreeData.event;

  constructor(private context: ExtensionContext) {
    reaction(
      () => [
        store.repos.map((repo) => [
          repo.isLoading,
          repo.hasTours,
          repo.tree?.tree.map((item) => item.path)
        ])
      ],
      () => {
        this._onDidChangeTreeData.fire();
      }
    );
  }

  getFileNodes(parent: Repository | RepositoryFile, repo: Repository) {
    return parent.files!.map((file) => new RepositoryFileNode(repo, file));
  }

  getTreeItem = (node: TreeItem) => node;

  getChildren(element?: TreeItem): ProviderResult<TreeItem[]> {
    if (!element) {
      return store.repos
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((repo) => new RepositoryNode(repo, this.context));
    } else if (element instanceof RepositoryNode) {
      if (element.repo.isLoading) {
        return [new TreeItem("Loading repository...")];
      }

      return this.getFileNodes(element.repo, element.repo);
    } else if (element instanceof RepositoryFileNode) {
      return this.getFileNodes(element.file, element.repo);
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
