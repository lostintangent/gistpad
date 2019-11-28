import * as path from "path";
import { TreeItem, TreeItemCollapsibleState, ThemeIcon } from "vscode";
import { fileNameToUri, getGistLabel } from "../utils";
import { Gist } from "../api";

export abstract class TreeNode extends TreeItem {
  constructor(
    label: string,
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None
  ) {
    super(label, collapsibleState);
  }
}

export class OpenGistNode extends TreeNode {
    constructor() {
      super("Open Gist...");
  
      this.command = {
        command: "gistpad.openGist",
        title: "Open Gist.."
      };
    }
}

export class SignInNode extends TreeNode {
  constructor() {
    super("Sign in to view your Gists...");

    this.command = {
      command: "gistpad.signIn",
      title: "Sign in to view your Gists..."
    };
  }
}

export class LoadingNode extends TreeNode {
    constructor() {
      super("Loading Gists...");
    }
}

export class GistsNode extends TreeNode {
  constructor(extensionPath: string) {
    super("Your Gists", TreeItemCollapsibleState.Expanded);

    this.iconPath = path.join(extensionPath, "images/gist.svg");
    this.contextValue = "gists";
  }
}

export class CreateNewGistNode extends TreeNode {
    constructor() {
      super("Create new Gist...");
  
      this.command = {
          command: "gistpad.newPublicGist",
          title: "Create new Gist..."
      }
    }
}

export class NoStarredGistsNode extends TreeNode {
  constructor() {
    super("No starred Gists");
  }
}

export class GistNode extends TreeNode {
    constructor(public gist: Gist) {
      super(getGistLabel(gist), TreeItemCollapsibleState.Collapsed);
  
      this.description = gist.description;
      this.tooltip = `${this.label} - ${this.description}`;
      this.contextValue = "gists.gist";
    }
}

export class GistFileNode extends TreeNode {
  constructor(public gistId: string, public filename: string) {
    super(filename);

    this.iconPath = ThemeIcon.File;
    this.resourceUri = fileNameToUri(gistId, filename);
    this.contextValue = "gists.gist.file";

    this.command = {
      command: "vscode.open",
      title: "Open File",
      arguments: [this.resourceUri]
    }
  }
}

export class StarredGistsNode extends TreeNode {
    constructor(extensionPath: string) {
      super("Starred Gists", TreeItemCollapsibleState.Expanded);

      this.iconPath = path.join(extensionPath, "images/star.svg");
      this.contextValue = "starredGists";
    }
}

export class StarredGistNode extends TreeNode {
  constructor(public gist: Gist) {
      super(getGistLabel(gist), TreeItemCollapsibleState.Collapsed);
  
      this.description = gist.description;
      this.tooltip = `${this.label} - ${this.description}`;
      this.contextValue = "starredGists.gist";
    }
}