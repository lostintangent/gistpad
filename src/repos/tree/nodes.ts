import {
  ExtensionContext,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Uri
} from "vscode";
import { joinPath } from "../../utils";
import { RepoFileSystemProvider } from "../fileSystem";
import { Repository, RepositoryFile, TreeItemBackLink } from "../store";

export class RepositoryNode extends TreeItem {
  constructor(public repo: Repository, context: ExtensionContext) {
    super(repo.name, TreeItemCollapsibleState.Collapsed);

    this.iconPath = joinPath(context, "images/git.svg");
    this.contextValue = "gistpad." + (repo.isWiki ? "wiki" : "repo");

    if (repo.branch !== Repository.DEFAULT_BRANCH) {
      this.contextValue += ".branch";
      this.description = repo.branch;
    }

    if (repo.hasTours) {
      this.contextValue += ".hasTours";
    }

    this.tooltip = `Repo: ${repo.name}
Branch: ${repo.branch}`;
  }
}

export class RepositoryFileNode extends TreeItem {
  constructor(public repo: Repository, public file: RepositoryFile) {
    super(
      file.name,
      file.isDirectory || file.backLinks
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );

    this.iconPath = file.isDirectory ? ThemeIcon.Folder : ThemeIcon.File;
    this.resourceUri = file.uri;

    if (!file.isDirectory) {
      this.command = {
        command: "vscode.open",
        title: "Open file",
        arguments: [file.uri]
      };
    }

    const repoType = repo.isWiki ? "wiki" : "repo";
    this.contextValue = file.isDirectory
      ? `gistpad.${repoType}Directory`
      : "gistpad.repoFile";
  }
}

function getbackLinkDisplayName(uri: Uri) {
  const [, file] = RepoFileSystemProvider.getRepoInfo(uri)!;
  return file?.displayName || file?.path || "";
}

export class RepositoryFileBackLinkNode extends TreeItem {
  constructor(repo: string, public backLink: TreeItemBackLink) {
    super(
      getbackLinkDisplayName(backLink.location.uri),
      TreeItemCollapsibleState.None
    );

    this.description = backLink.linePreview;
    this.tooltip = backLink.linePreview;

    this.command = {
      command: "vscode.open",
      arguments: [
        backLink.location.uri,
        { selection: backLink.location.range }
      ],
      title: "Open File"
    };

    this.contextValue = "gistpad.repoFile.backLink";
  }
}
