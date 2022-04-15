import {
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Uri
} from "vscode";
import { RepoFileSystemProvider } from "../fileSystem";
import { Repository, RepositoryFile, store, TreeItemBackLink } from "../store";

export class RepositoryNode extends TreeItem {
  constructor(public repo: Repository) {
    super(repo.name, TreeItemCollapsibleState.Expanded);

    const iconName = repo.isWiki ? "book" : "repo";
    this.iconPath = new ThemeIcon(iconName);

    this.contextValue =
      "gistpad." + (repo.isSwing ? "swing" : repo.isWiki ? "wiki" : "repo");

    if (repo.isWiki && store.wiki?.name === repo.name) {
      this.description = "Primary";
    }

    if (repo.branch !== repo.defaultBranch) {
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

    if (repo.isWiki && file.backLinks) {
      this.description = file.backLinks.length.toString();
    } else if (file.isDirectory) {
      this.description = file.files!.length.toString();
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
