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
import { EXTENSION_NAME } from "../constants";
import { getGistFiles } from "../tree";
import {
  FollowedUserGistNode,
  GistDirectoryNode,
  GistNode,
  LoadingNode,
  TreeNode
} from "../tree/nodes";
import { isOwnedGist } from "../utils";
import { GistShowcaseCategory, store } from "./store";

export class GistShowcaseCategoryNode extends TreeNode {
  constructor(public category: GistShowcaseCategory) {
    super(category.title, TreeItemCollapsibleState.Expanded);
    this.contextValue = "showcase.category";
  }
}

class ShowcaseTreeProvider implements TreeDataProvider<TreeNode>, Disposable {
  private _disposables: Disposable[] = [];

  private _onDidChangeTreeData = new EventEmitter<void>();
  public readonly onDidChangeTreeData: Event<void> = this._onDidChangeTreeData
    .event;

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
        return [new TreeNode("Loading showcase...")];
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

export function registerTreeProvider(extensionContext: ExtensionContext) {
  window.createTreeView(`${EXTENSION_NAME}.showcase`, {
    showCollapseAll: true,
    treeDataProvider: new ShowcaseTreeProvider(extensionContext),
    canSelectMany: true
  });
}
