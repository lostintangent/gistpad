import { reaction } from "mobx";
import {
  Disposable,
  Event,
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  TreeView,
  window
} from "vscode";
import { EXTENSION_NAME } from "../constants";
import { Gist, Store, store } from "../store";
import { isOwnedGist, isTempGistId } from "../utils";
import {
  FollowedUserGistNode,
  GistFileNode,
  GistNode,
  TreeNode
} from "./nodes";

class ActiveGistTreeProvider implements TreeDataProvider<TreeNode>, Disposable {
  private _disposables: Disposable[] = [];
  private _isOwnedGist: boolean = false;
  private _isTempGist: boolean = false;
  private _gist: Gist;

  private _onDidChangeTreeData = new EventEmitter<TreeNode>();
  public readonly onDidChangeTreeData: Event<TreeNode> = this
    ._onDidChangeTreeData.event;

  constructor(gistId: string, private extensionPath: string) {
    this._isOwnedGist = isOwnedGist(gistId);
    this._isTempGist = isTempGistId(gistId);
    this._gist = store.gists.find((gist) => gist.id === gistId)!;

    if (this._isOwnedGist) {
      reaction(
        () => [this._gist.description, this._gist.updated_at],
        () => {
          this._onDidChangeTreeData.fire();
        }
      );
    }
  }

  getTreeItem(node: TreeNode): TreeItem {
    return node;
  }

  getChildren(element?: TreeNode): ProviderResult<TreeNode[]> {
    if (!element) {
      const gistNode =
        this._isOwnedGist || this._isTempGist
          ? new GistNode(
              this._gist,
              this.extensionPath,
              TreeItemCollapsibleState.Expanded
            )
          : new FollowedUserGistNode(
              this._gist,
              this.extensionPath,
              TreeItemCollapsibleState.Expanded
            );

      return [gistNode];
    } else if (element instanceof GistNode) {
      const { files, id } = element.gist;
      const isOwned = isOwnedGist(id);

      return Object.entries(files).map(
        ([_, file]) => new GistFileNode(id, file, !isOwned)
      );
    }
  }

  dispose() {
    this._disposables.forEach((disposable) => disposable.dispose());
  }
}

export function registerTreeProvider(store: Store, extensionPath: string) {
  let treeView: TreeView<TreeNode>;
  reaction(
    () => [store.activeGist],
    (activeGist) => {
      if (activeGist) {
        treeView = window.createTreeView(`${EXTENSION_NAME}.activeGist`, {
          showCollapseAll: true,
          treeDataProvider: new ActiveGistTreeProvider(
            store.activeGist!,
            extensionPath
          ),
          canSelectMany: true
        });
      } else {
        treeView.dispose();
      }
    }
  );
}
