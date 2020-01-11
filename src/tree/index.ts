import { reaction } from "mobx";
import { Disposable, Event, EventEmitter, ProviderResult, TreeDataProvider, TreeItem, window } from "vscode";
import { EXTENSION_ID } from "../constants";
import { gistsSectionOpen } from "../gistUpdates";
import { IStore } from "../store";
import { sortGists } from "../utils";
import { CreateNewGistNode, FollowedUserGistNode, FollowedUserGistsNode, GistFileNode, GistNode, GistsNode, LoadingNode, NoStarredGistsNode, NoUserGistsNode, OpenGistNode, SignInNode, StarredGistNode, StarredGistsNode, TreeNode } from "./nodes";

class GistTreeProvider implements TreeDataProvider<TreeNode>, Disposable {
  private _disposables: Disposable[] = [];

  private _onDidChangeTreeData = new EventEmitter<TreeNode>();
  public readonly onDidChangeTreeData: Event<TreeNode> = this
    ._onDidChangeTreeData.event;

  constructor(private store: IStore, private extensionPath: string) {
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

  public refresh = (data?: TreeNode) => {
    this._onDidChangeTreeData.fire(data);
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
            const starredGistsNode = new StarredGistsNode(this.extensionPath);
            nodes.push(starredGistsNode);
          }

          if (this.store.followedUsers.length > 0) {
            this.store.followedUsers.forEach((user) => {
              const gistsDiff = gistsSectionOpen(`gistpad.followed.user.${user.username}`, user.gists);

              nodes.push(new FollowedUserGistsNode(user, this.extensionPath, gistsDiff.length));
            });
          }

          return nodes;
        }
      }
    } else if (element instanceof GistsNode) {
      if (this.store.gists.length === 0) {
        return [new CreateNewGistNode()];
      } else {
        return sortGists(this.store.gists).map((gist) => new GistNode(gist));
      }
    } else if (element instanceof StarredGistsNode) {
      const section = `gistpad.starred.section`;
      console.log(element);

      if (this.store.starredGists.length === 0) {
        return [new NoStarredGistsNode()];
      } else {
        return sortGists(this.store.starredGists).map(
          (gist) => new StarredGistNode(gist, section, element)
        );
      }
    } else if (element instanceof GistNode) {
      return Object.entries(element.gist.files).map(
        ([_, file]) => new GistFileNode(element.gist, file, false)
      );
    } else if (element instanceof StarredGistNode) {
      return Object.entries(element.gist.files).map(
        ([_, file]) => new GistFileNode(element.gist, file)
      );
    } else if (element instanceof FollowedUserGistsNode) {
      const section = `gistpad.followed.user.${element.user.username}`;

      if (element.user.isLoading) {
        return [new LoadingNode()];
      } else if (element.user.gists.length === 0) {
        return [new NoUserGistsNode()];
      } else {
        const gistsDiff = gistsSectionOpen(section, element.user.gists);

        return sortGists(element.user.gists).map(
          (gist) => {
            const gistDiff = gistsDiff.find((gistDiffItem) => {
              return (gistDiffItem.gistId === gist.id);
            });

            return new FollowedUserGistNode(gist, section, element, this.extensionPath, gistDiff);
          }
        );
      }
    } else if (element instanceof FollowedUserGistNode) {
      return Object.entries(element.gist.files).map(
        ([_, file]) => new GistFileNode(element.gist, file)
      );
    }
  }

  dispose() {
    this._disposables.forEach((disposable) => disposable.dispose());
  }
}

export let refreshTree: (data?: TreeNode) => void;

export function registerTreeProvider(store: IStore, extensionPath: string) {
  const treeDataProvider = new GistTreeProvider(store, extensionPath);
  window.createTreeView(`${EXTENSION_ID}.gists`, {
    showCollapseAll: true,
    treeDataProvider,
    canSelectMany: true
  });

  // setInterval(async () => {
  //   const tree = await treeDataProvider.getChildren();

  //   console.clear();

  //   if (!tree) {
  //     console.log(`-=-=-=-=->>> no tree`);
  //     return;
  //   }

  //   for (let leaf of tree) {
  //     const treeItem = treeDataProvider.getTreeItem(leaf);
  //     console.log(treeItem.label, treeItem.collapsibleState);
  //   }
  // }, 2000);

  window.createTreeView(`${EXTENSION_ID}.gists.explorer`, {
    showCollapseAll: true,
    treeDataProvider,
    canSelectMany: true
  });

  refreshTree = treeDataProvider.refresh;
}
