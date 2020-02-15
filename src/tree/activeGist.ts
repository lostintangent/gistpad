import { reaction } from "mobx";
import {
  Disposable,
  Event,
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  window
} from "vscode";
import { getGistFiles } from ".";
import { EXTENSION_NAME } from "../constants";
import { Store, store } from "../store";
import { isOwnedGist, isTempGistId } from "../utils";
import {
  FollowedUserGistNode,
  GistDirectoryNode,
  GistNode,
  OpenGistNode,
  TreeNode
} from "./nodes";

class ActiveGistTreeProvider implements TreeDataProvider<TreeNode>, Disposable {
  private _disposables: Disposable[] = [];

  private _onDidChangeTreeData = new EventEmitter<TreeNode>();
  public readonly onDidChangeTreeData: Event<TreeNode> = this
    ._onDidChangeTreeData.event;

  constructor(private extensionPath: string) {
    reaction(
      () => {
        if (store.activeGist) {
          return [store.activeGist.description, store.activeGist.updated_at];
        } else {
          return null;
        }
      },
      () => {
        this._onDidChangeTreeData.fire();
      }
    );
  }

  getTreeItem(node: TreeNode): TreeItem {
    return node;
  }

  getChildren(element?: TreeNode): ProviderResult<TreeNode[]> {
    if (!element) {
      if (!store.activeGist) {
        return [new OpenGistNode()];
      }

      const owned =
        isOwnedGist(store.activeGist.id) || isTempGistId(store.activeGist.id);

      const gistNode = owned
        ? new GistNode(
            store.activeGist,
            this.extensionPath,
            TreeItemCollapsibleState.Expanded
          )
        : new FollowedUserGistNode(
            store.activeGist,
            this.extensionPath,
            TreeItemCollapsibleState.Expanded
          );

      return [gistNode];
    } else if (element instanceof GistNode) {
      return getGistFiles(element.gist);
    } else if (element instanceof GistDirectoryNode) {
      return getGistFiles(element.gist, element.directory);
    }
  }

  dispose() {
    this._disposables.forEach((disposable) => disposable.dispose());
  }
}

export function registerTreeProvider(store: Store, extensionPath: string) {
  window.createTreeView(`${EXTENSION_NAME}.activeGist`, {
    showCollapseAll: true,
    treeDataProvider: new ActiveGistTreeProvider(extensionPath),
    canSelectMany: true
  });
}
