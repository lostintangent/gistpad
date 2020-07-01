import { reaction } from "mobx";
import {
  Disposable,
  Event,
  EventEmitter,
  ExtensionContext,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  window
} from "vscode";
import { getGistFiles } from ".";
import { EXTENSION_NAME } from "../constants";
import { Store, store } from "../store";
import { isOwnedGist } from "../utils";
import {
  FollowedUserGistNode,
  GistDirectoryNode,
  GistNode,
  GistShowcaseCategoryNode,
  LoadingNode,
  LoadingShowcaseNode,
  TreeNode
} from "./nodes";

class ShowcaseTreeProvider implements TreeDataProvider<TreeNode>, Disposable {
  private _disposables: Disposable[] = [];

  private _onDidChangeTreeData = new EventEmitter<TreeNode>();
  public readonly onDidChangeTreeData: Event<TreeNode> = this
    ._onDidChangeTreeData.event;

  constructor(private extensionContext: ExtensionContext) {
    reaction(
      () => [
        store.showcase.isLoading,
        store.showcase?.categories.map((category) => [category.isLoading])
      ],
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
      if (store.showcase.isLoading) {
        return [new LoadingShowcaseNode()];
      }

      return store.showcase?.categories.map(
        (category) => new GistShowcaseCategoryNode(category)
      );
    } else if (element instanceof GistShowcaseCategoryNode) {
      if (element.category.isLoading) {
        return [new LoadingNode()];
      }

      return element.category.gists.map((gist) => {
        const owned = isOwnedGist(gist.id);

        return owned
          ? new GistNode(gist, this.extensionContext)
          : new FollowedUserGistNode(gist, this.extensionContext);
      });
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

export function registerTreeProvider(
  store: Store,
  extensionContext: ExtensionContext
) {
  window.createTreeView(`${EXTENSION_NAME}.showcase`, {
    showCollapseAll: true,
    treeDataProvider: new ShowcaseTreeProvider(extensionContext),
    canSelectMany: true
  });
}
