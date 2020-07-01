import { reaction } from "mobx";
import {
  Disposable,
  Event,
  EventEmitter,
  ExtensionContext,
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
  TreeNode
} from "./nodes";

class ActiveGistTreeProvider implements TreeDataProvider<TreeNode>, Disposable {
  private _disposables: Disposable[] = [];

  private _onDidChangeTreeData = new EventEmitter<TreeNode | void>();
  public readonly onDidChangeTreeData: Event<TreeNode | void> = this
    ._onDidChangeTreeData.event;

  constructor(private extensionContext: ExtensionContext) {
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
        return undefined;
      }

      const owned =
        isOwnedGist(store.activeGist.id) || isTempGistId(store.activeGist.id);

      const gistNode = owned
        ? new GistNode(
          store.activeGist,
          this.extensionContext,
          true,
          TreeItemCollapsibleState.Expanded
        )
        : new FollowedUserGistNode(
          store.activeGist,
          this.extensionContext,
          true,
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

export function registerTreeProvider(store: Store, extensionContext: ExtensionContext) {
  window.createTreeView(`${EXTENSION_NAME}.activeGist`, {
    showCollapseAll: true,
    treeDataProvider: new ActiveGistTreeProvider(extensionContext),
    canSelectMany: true
  });
}
