import { reaction } from "mobx";
import {
  Disposable,
  Event,
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  window
} from "vscode";
import { EXTENSION_NAME } from "../constants";
import { Store } from "../store";
import { sortGists } from "../utils";
import {
  CreateNewGistNode,
  FollowedUserGistNode,
  FollowedUserGistsNode,
  GistFileNode,
  GistNode,
  GistsNode,
  LoadingNode,
  NoStarredGistsNode,
  NoUserGistsNode,
  OpenGistNode,
  SignInNode,
  StarredGistNode,
  StarredGistsNode,
  TreeNode
} from "./nodes";

class GistTreeProvider implements TreeDataProvider<TreeNode>, Disposable {
  private _disposables: Disposable[] = [];

  private _onDidChangeTreeData = new EventEmitter<TreeNode>();
  public readonly onDidChangeTreeData: Event<TreeNode> = this
    ._onDidChangeTreeData.event;

  constructor(private store: Store, private extensionPath: string) {
    reaction(
      () => [
        store.gists.map((gist) => [gist.description, gist.updated_at]),
        store.starredGists.length,
        store.followedUsers.map((user) => user.isLoading),
        store.isLoading,
        store.isSignedIn,
        store.sortOrder
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
      if (!this.store.isSignedIn) {
        return [new OpenGistNode(), new SignInNode()];
      } else {
        if (this.store.isLoading) {
          return [new LoadingNode()];
        } else {
          const nodes: TreeNode[] = [
            new GistsNode(this.store.login, this.extensionPath)
          ];

          if (this.store.starredGists.length > 0) {
            nodes.push(new StarredGistsNode(this.extensionPath));
          }

          if (this.store.followedUsers.length > 0) {
            this.store.followedUsers.forEach((user) => {
              nodes.push(new FollowedUserGistsNode(user, this.extensionPath));
            });
          }

          return nodes;
        }
      }
    } else if (element instanceof GistsNode) {
      if (this.store.gists.length === 0) {
        return [new CreateNewGistNode()];
      } else {
        return sortGists(this.store.gists).map(
          (gist) => new GistNode(gist, this.extensionPath)
        );
      }
    } else if (element instanceof StarredGistsNode) {
      if (this.store.starredGists.length === 0) {
        return [new NoStarredGistsNode()];
      } else {
        return sortGists(this.store.starredGists).map(
          (gist) => new StarredGistNode(gist, this.extensionPath)
        );
      }
    } else if (element instanceof GistNode) {
      return Object.entries(element.gist.files).map(
        ([_, file]) => new GistFileNode(element.gist.id, file, false)
      );
    } else if (element instanceof StarredGistNode) {
      return Object.entries(element.gist.files).map(
        ([_, file]) => new GistFileNode(element.gist.id, file)
      );
    } else if (element instanceof FollowedUserGistsNode) {
      if (element.user.isLoading) {
        return [new LoadingNode()];
      } else if (element.user.gists.length === 0) {
        return [new NoUserGistsNode()];
      } else {
        return sortGists(element.user.gists).map(
          (gist) => new FollowedUserGistNode(gist, this.extensionPath)
        );
      }
    } else if (element instanceof FollowedUserGistNode) {
      return Object.entries(element.gist.files).map(
        ([_, file]) => new GistFileNode(element.gist.id, file)
      );
    }
  }

  dispose() {
    this._disposables.forEach((disposable) => disposable.dispose());
  }
}

export function registerTreeProvider(store: Store, extensionPath: string) {
  const treeDataProvider = new GistTreeProvider(store, extensionPath);
  window.createTreeView(`${EXTENSION_NAME}.gists`, {
    showCollapseAll: true,
    treeDataProvider,
    canSelectMany: true
  });

  window.createTreeView(`${EXTENSION_NAME}.gists.explorer`, {
    showCollapseAll: true,
    treeDataProvider,
    canSelectMany: true
  });
}
