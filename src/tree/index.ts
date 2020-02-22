import { reaction } from "mobx";
import {
  Disposable,
  Event,
  EventEmitter,
  FileType,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  window,
  workspace
} from "vscode";
import { EXTENSION_NAME, TEMP_GIST_ID } from "../constants";
import { Gist, GroupType, Store } from "../store";
import { encodeDirectoryName, fileNameToUri, sortGists } from "../utils";
import {
  CreateNewGistNode,
  FollowedUserGistNode,
  FollowedUserGistsNode,
  GistDirectoryNode,
  GistFileNode,
  GistGroupNode,
  GistNode,
  GistsNode,
  LoadingNode,
  NewPlaygroundNode,
  NoStarredGistsNode,
  NoUserGistsNode,
  OpenGistNode,
  SignInNode,
  StarredGistNode,
  StarredGistsNode,
  TreeNode
} from "./nodes";

export async function getGistFiles(gist: Gist, subDirectory?: string) {
  const directory = subDirectory ? `${subDirectory}/` : "";
  const files = await workspace.fs.readDirectory(
    fileNameToUri(gist.id, directory)
  );

  return files
    .sort(([_, typeA], [__, typeB]) => typeB - typeA)
    .map(([file, fileType]) => {
      return fileType === FileType.Directory
        ? new GistDirectoryNode(gist, file)
        : new GistFileNode(
            gist.id,
            gist.files[`${encodeDirectoryName(directory)}${file}`]
          );
    });
}

class GistTreeProvider implements TreeDataProvider<TreeNode>, Disposable {
  private _disposables: Disposable[] = [];

  private _onDidChangeTreeData = new EventEmitter<TreeNode>();
  public readonly onDidChangeTreeData: Event<TreeNode> = this
    ._onDidChangeTreeData.event;

  constructor(private store: Store, private extensionPath: string) {
    reaction(
      () => [
        store.gists.map((gist) => [gist.description, gist.updated_at]),
        store.starredGists.map((gist) => [gist.description, gist.updated_at]),
        store.followedUsers.map((user) => user.isLoading),
        store.isLoading,
        store.isSignedIn,
        store.sortOrder,
        store.groupType
      ],
      () => {
        this._onDidChangeTreeData.fire();
      }
    );
  }

  getTreeItem(node: TreeNode): TreeItem {
    return node;
  }

  groupGists(
    gists: Gist[],
    nodeConstructor: new (
      gist: Gist,
      extensionPath: string,
      showIcon?: boolean
    ) => GistNode,
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Expanded
  ) {
    if (this.store.groupType !== GroupType.none) {
      const types = gists
        .reduce((acc, gist) => {
          // @ts-ignore
          if (!acc.includes(gist.type)) {
            // @ts-ignore
            acc.push(gist.type);
          }
          return acc;
        }, [])
        .sort();

      return types.map(
        (type) =>
          new GistGroupNode(
            type,
            sortGists(gists.filter((gist) => gist.type === type)),
            nodeConstructor,
            this.extensionPath,
            collapsibleState
          )
      );
    } else {
      return sortGists(gists)
        .filter((gist) => gist.id !== TEMP_GIST_ID)
        .map((gist) => new nodeConstructor(gist, this.extensionPath));
    }
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[] | undefined> {
    if (!element) {
      if (!this.store.isSignedIn) {
        return [new OpenGistNode(), new NewPlaygroundNode(), new SignInNode()];
      } else {
        if (this.store.isLoading) {
          return [new LoadingNode()];
        } else {
          const nodes: TreeNode[] = [
            new GistsNode(
              this.store.gists.length,
              this.store.login,
              this.extensionPath
            )
          ];

          if (this.store.starredGists.length > 0) {
            nodes.push(
              new StarredGistsNode(
                this.store.starredGists.length,
                this.extensionPath
              )
            );
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
        return this.groupGists(this.store.gists, GistNode);
      }
    } else if (element instanceof StarredGistsNode) {
      if (this.store.starredGists.length === 0) {
        return [new NoStarredGistsNode()];
      } else {
        return this.groupGists(
          this.store.starredGists,
          StarredGistNode,
          TreeItemCollapsibleState.Collapsed
        );
      }
    } else if (element instanceof GistGroupNode) {
      const showIcons = this.store.groupType === GroupType.none;
      return element.gists.map(
        (gist) =>
          new element.nodeConstructor(gist, this.extensionPath, showIcons)
      );
    } else if (element instanceof GistNode) {
      return getGistFiles(element.gist);
    } else if (element instanceof StarredGistNode) {
      return getGistFiles(element.gist);
    } else if (element instanceof FollowedUserGistsNode) {
      if (element.user.isLoading) {
        return [new LoadingNode()];
      } else if (element.user.gists.length === 0) {
        return [new NoUserGistsNode()];
      } else {
        return this.groupGists(
          element.user.gists,
          FollowedUserGistNode,
          TreeItemCollapsibleState.Collapsed
        );
      }
    } else if (element instanceof FollowedUserGistNode) {
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
