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
  private _onDidChangeTreeData = new EventEmitter<TreeItem>();
  public readonly onDidChangeTreeData: Event<TreeItem> = this
    ._onDidChangeTreeData.event;

  constructor(private context: ExtensionContext) {
    reaction(
      () => [
        store.repos.map((repo) => [
          repo.isLoading,
          repo.hasTours,
          repo.tree ? repo.tree.tree.map((item) => item.path) : null
        ])
      ],
      () => {
        this._onDidChangeTreeData.fire();
      }
    );
  }

  getFileNodes(parent: Repository | RepositoryFile, repo: Repository) {
    return parent.files?.map((file) => new RepositoryFileNode(repo, file));
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

      const fileNodes = this.getFileNodes(element.repo, element.repo);
      if (fileNodes) {
        return fileNodes;
      } else {
        const addFileItem = new TreeItem("Add new file");
        addFileItem.command = {
          command: `${EXTENSION_NAME}.addRepositoryFile`,
          title: "Add new file",
          arguments: [element]
        };

        return [addFileItem];
      }
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
