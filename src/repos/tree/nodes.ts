import * as path from "path";
import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { Repository, RepositoryFile } from "../store";

export class RepositoryNode extends TreeItem {
  constructor(public repo: Repository, extensionPath: string) {
    super(repo.name, TreeItemCollapsibleState.Collapsed);

    this.iconPath = path.join(extensionPath, "images/git.svg");
    this.contextValue = "gistpad.repo";

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
      file.isDirectory
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

    this.contextValue = file.isDirectory
      ? "gistpad.repoDirectory"
      : "gistpad.repoFile";
  }
}
