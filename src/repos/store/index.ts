import { computed, observable } from "mobx";
import * as path from "path";
import { CommentThread, Uri } from "vscode";
import { GistComment } from "../../store";

type TreeItemType = "blob" | "tree";

export interface TreeItem {
  path: string;
  mode: string;
  type: TreeItemType;
  sha: string;
  size: number;
  url: string;
}

export interface Tree {
  sha: string;
  url: string;
  tree: TreeItem[];
}

export class RepositoryFile {
  name: string;
  path: string;
  size: number;
  sha: string;
  mode: string;
  contents: string | undefined;
  isDirectory: boolean;
  uri: Uri;

  @observable tree: Tree;

  constructor(
    public repo: Repository,
    public treeItem: TreeItem,
    tree: Tree,
    public parent?: RepositoryFile
  ) {
    this.tree = tree;

    this.isDirectory = treeItem.type === "tree";
    this.path = treeItem.path;
    this.name = path.basename(this.path);
    this.size = treeItem.size;
    this.sha = treeItem.sha;
    this.mode = treeItem.mode;

    this.uri = Uri.parse(`repo:/${repo.name}/${this.path}`);
  }

  @computed
  get files(): RepositoryFile[] | undefined {
    if (this.isDirectory) {
      return this.tree.tree
        .filter((item) => {
          const pathPrefix = `${this.path}/`;
          return (
            item.path.startsWith(pathPrefix) &&
            item.path.replace(pathPrefix, "").indexOf("/") === -1
          );
        })
        .sort((a, b) => {
          return b.type.localeCompare(a.type);
        })
        .map((item) => new RepositoryFile(this.repo, item, this.tree, this));
    }
  }

  @computed
  get comments(): RepositoryComment[] {
    return this.repo.comments.filter((comment) => comment.path === this.path);
  }
}

type RepositoryComment = GistComment & { path: string };

export class Repository {
  @observable isLoading: boolean = true;
  @observable tree: Tree | undefined;
  latestCommit: string = "";
  comments: RepositoryComment[] = [];
  threads: CommentThread[] = [];

  constructor(public name: string) {}

  @computed
  get files(): RepositoryFile[] {
    return this.tree!.tree.filter((item) => !item.path.includes("/"))
      .sort((a, b) => {
        return b.type.localeCompare(a.type);
      })
      .map((item) => new RepositoryFile(this, item, this.tree!));
  }

  setFiles(tree: Tree) {
    this.tree = tree;

    this.isLoading = false;
  }
}

export const store = observable({
  repos: [] as Repository[]
});
