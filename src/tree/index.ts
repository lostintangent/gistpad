import { reaction } from "mobx";
import {
  Disposable,
  Event,
  EventEmitter,
  ExtensionContext,
  FileType,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  window,
  workspace
} from "vscode";
import { EXTENSION_NAME, SCRATCH_TEMPLATE_FILENAME } from "../constants";
import { Gist, GroupType, Store } from "../store";
import { encodeDirectoryName, fileNameToUri, sortGists } from "../utils";
import {
  ArchivedGistsNode,
  CreateNewGistNode,
  FollowedUserGistNode,
  FollowedUserGistsNode,
  GistDirectoryNode,
  GistFileNode,
  GistGroupNode,
  GistNode,
  GistsNode,
  LoadingNode,
  NewScratchNoteNode,
  NoStarredGistsNode,
  NoUserGistsNode,
  ScratchGistNode,
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
  private _onDidChangeTreeData = new EventEmitter<void>();
  public readonly onDidChangeTreeData: Event<void> =
    this._onDidChangeTreeData.event;

  private readonly COLLAPSED_STATES_KEY = "gistTreeCollapsedStates";

  constructor(
    private store: Store,
    private extensionContext: ExtensionContext
  ) {
    reaction(
      () => [
        store.scratchNotes.gist ? store.scratchNotes.gist.updated_at : null,
        store.scratchNotes.show,
        store.gists.map((gist) => [gist.description, gist.updated_at]),
        store.archivedGists.map((gist) => [gist.description, gist.updated_at]),
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

  private getCollapsedStates(): { [key: string]: boolean } {
    return this.extensionContext.globalState.get(this.COLLAPSED_STATES_KEY, {});
  }

  private isRootNode(node: TreeNode): boolean {
    return (
      node instanceof GistsNode ||
      node instanceof StarredGistsNode ||
      node instanceof ScratchGistNode ||
      node instanceof ArchivedGistsNode
    );
  }

  public async setCollapsedState(node: TreeNode, collapsed: boolean) {
    if (this.isRootNode(node)) {
      const states = this.getCollapsedStates();
      states[node.contextValue!] = collapsed;

      await this.extensionContext.globalState.update(
        this.COLLAPSED_STATES_KEY,
        states
      );
    }
  }

  getTreeItem(node: TreeNode): TreeItem {
    if (this.isRootNode(node)) {
      const states = this.getCollapsedStates();
      const state = states[node.contextValue!];

      if (state !== undefined) {
        node.collapsibleState = state
          ? TreeItemCollapsibleState.Collapsed
          : TreeItemCollapsibleState.Expanded;
      }
    }

    return node;
  }

  groupGists(
    gists: Gist[],
    nodeConstructor: new (
      gist: Gist,
      extensionContext: ExtensionContext,
      showIcon?: boolean
    ) => GistNode,
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Collapsed
  ) {
    if (this.store.groupType != GroupType.none) {
      const types = gists.map((gist) => gist.type);
      const tags = gists.flatMap((gist) => gist.tags);

      const tagsAndTypes = new Set(tags.concat(types).sort());

      return Array.from(tagsAndTypes).map(
        (tag) =>
          new GistGroupNode(
            tag!,
            sortGists(
              gists.filter(
                (gist) => gist.type === tag || gist.tags?.includes(tag!)
              )
            ),
            nodeConstructor,
            this.extensionContext,
            collapsibleState
          )
      );
    } else {
      return sortGists(gists).map(
        (gist) => new nodeConstructor(gist, this.extensionContext)
      );
    }
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[] | undefined> {
    if (!element) {
      if (!this.store.isSignedIn) {
        // Display the welcome view
        return undefined;
      } else {
        if (this.store.isLoading) {
          return [new LoadingNode()];
        } else {
          const nodes: TreeNode[] = [
            new GistsNode(
              this.store.gists.length,
              this.store.login,
              this.extensionContext
            )
          ];

          if (this.store.scratchNotes.show) {
            nodes.unshift(
              new ScratchGistNode(
                this.extensionContext,
                this.store.scratchNotes.gist
              )
            );
          }

          if (this.store.starredGists.length > 0) {
            nodes.push(
              new StarredGistsNode(
                this.store.starredGists.length,
                this.extensionContext
              )
            );
          }

          if (this.store.followedUsers.length > 0) {
            this.store.followedUsers.forEach((user) => {
              nodes.push(
                new FollowedUserGistsNode(user, this.extensionContext)
              );
            });
          }

          if (this.store.archivedGists.length > 0) {
            nodes.push(new ArchivedGistsNode(this.store.archivedGists.length));
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
    } else if (element instanceof ArchivedGistsNode) {
      return this.groupGists(this.store.archivedGists, GistNode);
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
      const showIcons = this.store.groupType == GroupType.none;
      return element.gists.map(
        (gist) =>
          new element.nodeConstructor(gist, this.extensionContext, showIcons)
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
    } else if (element instanceof ScratchGistNode) {
      if (
        !element.gist ||
        Object.keys(element.gist.files).filter(
          (file) => file !== SCRATCH_TEMPLATE_FILENAME
        ).length === 0
      ) {
        return [new NewScratchNoteNode()];
      } else {
        const children = await getGistFiles(element.gist);
        return children.filter(
          (child) =>
            !(child instanceof GistFileNode && child.file.filename === SCRATCH_TEMPLATE_FILENAME)
        );
      }
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
  const treeDataProvider = new GistTreeProvider(store, extensionContext);
  const treeView = window.createTreeView(`${EXTENSION_NAME}.gists`, {
    showCollapseAll: true,
    treeDataProvider,
    canSelectMany: true
  });

  treeView.onDidCollapseElement((e) =>
    treeDataProvider.setCollapsedState(e.element, true)
  );

  treeView.onDidExpandElement((e) =>
    treeDataProvider.setCollapsedState(e.element, false)
  );
}
