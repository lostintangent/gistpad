import { ExtensionContext, ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { joinPath } from "../../utils";
import { Repository, RepositoryFile } from "../store";

export class RepositoryNode extends TreeItem {
  constructor(public repo: Repository, context: ExtensionContext) {
    super(repo.name, TreeItemCollapsibleState.Collapsed);

    this.iconPath = joinPath(context, "images/git.svg");
    this.contextValue = "gistpad.repo";
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
