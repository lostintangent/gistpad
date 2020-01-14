import * as moment from "moment";
import * as path from "path";
import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import * as config from "../config";
import { EXTENSION_NAME } from "../constants";
import { FollowedUser, Gist, GistFile } from "../store";
import {
  fileNameToUri,
  getGistDescription,
  getGistLabel,
  isNotebookGist,
  isPlaygroundGist
} from "../utils";

export abstract class TreeNode extends TreeItem {
  constructor(
    label: string,
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None
  ) {
    super(label, collapsibleState);
  }

  private getIconPath = (
    gist: Gist,
    iconName: string,
    extensionPath: string
  ) => {
    if (!gist.public) {
      iconName += "-secret";
    }

    return {
      dark: path.join(extensionPath, `images/dark/${iconName}.svg`),
      light: path.join(extensionPath, `images/light/${iconName}.svg`)
    };
  };

  public getGistTypeIcon = (gist: Gist, extensionPath: string) => {
    if (!config.get("treeIcons")) {
      return;
    }

    if (isPlaygroundGist(gist)) {
      return this.getIconPath(gist, "playground", extensionPath);
    }

    if (isBlogPostGist(gist)) {
      return this.getIconPath(gist, "blog-post", extensionPath);
    }

    if (isNotebookGist(gist)) {
      return this.getIconPath(gist, "jupyter", extensionPath);
    }

    return this.getIconPath(gist, "gist", extensionPath);
  };
}

export class OpenGistNode extends TreeNode {
  constructor() {
    super("Open Gist...");

    this.command = {
      command: `${EXTENSION_NAME}.openGist`,
      title: "Open Gist.."
    };
  }
}

export class SignInNode extends TreeNode {
  constructor() {
    super("Sign in to view your Gists...");

    this.command = {
      command: `${EXTENSION_NAME}.signIn`,
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
  constructor(public login: string, extensionPath: string) {
    super("Your Gists", TreeItemCollapsibleState.Expanded);

    this.iconPath = path.join(extensionPath, "images/icon-small.png");
    this.contextValue = "gists";
  }
}

export class CreateNewGistNode extends TreeNode {
  constructor() {
    super("Create new Gist...");

    this.command = {
      command: `${EXTENSION_NAME}.newPublicGist`,
      title: "Create new Gist..."
    };
  }
}

const isBlogPostGist = (gist: Gist) => {
  for (let [fileName] of Object.entries(gist.files)) {
    if (fileName === "gistlog.yml") {
      return true;
    }
  }
};

export class GistNode extends TreeNode {
  constructor(
    public gist: Gist,
    extensionPath: string,
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Collapsed
  ) {
    super(getGistLabel(gist), collapsibleState);

    this.description = getGistDescription(gist, !config.get("treeIcons"));
    this.iconPath = this.getGistTypeIcon(gist, extensionPath);

    this.tooltip = this.getTooltip(
      `Type: ${gist.public ? "Public" : "Secret"}`
    );
    this.contextValue = this.getContextValue("gists.gist");
  }

  getContextValue(baseContext: string) {
    let contextValue = baseContext;

    if (isNotebookGist(this.gist)) {
      contextValue += ".notebook";
    } else if (isPlaygroundGist(this.gist)) {
      contextValue += ".playground";
    }
    return contextValue;
  }

  getTooltip(suffix?: string) {
    let tooltip = `Description: ${this.label}
Updated: ${moment(this.gist.updated_at).calendar()}
Created: ${moment(this.gist.created_at).calendar()}`;

    if (suffix) {
      tooltip += `
${suffix}`;
    }

    return tooltip;
  }
}

export class GistFileNode extends TreeNode {
  constructor(
    public gistId: string,
    public file: GistFile,
    private isReadOnly = true
  ) {
    super(file.filename!);

    this.iconPath = ThemeIcon.File;
    this.resourceUri = fileNameToUri(gistId, file.filename!);
    this.contextValue = "gists.gist.file";

    this.command = {
      command: "gistpad.openGistFile",
      title: "Open Gist File",
      arguments: [this.resourceUri]
    };

    if (this.isReadOnly) {
      this.contextValue += ".readonly";
    }
  }
}

export class StarredGistsNode extends TreeNode {
  constructor(extensionPath: string) {
    super("Starred Gists", TreeItemCollapsibleState.Collapsed);

    this.iconPath = path.join(extensionPath, "images/star.svg");
    this.contextValue = "starredGists";
  }
}

export class NoStarredGistsNode extends TreeNode {
  constructor() {
    super("No starred Gists");
  }
}

export class StarredGistNode extends GistNode {
  constructor(public gist: Gist, extensionPath: string) {
    super(gist, extensionPath);

    const owner = gist.owner ? gist.owner.login : "Anonymous";
    this.tooltip = this.getTooltip(`Owner: ${owner}`);

    this.contextValue = this.getContextValue("starredGists.gist");
  }
}

export class FollowedUserGistsNode extends TreeNode {
  constructor(public user: FollowedUser, extensionPath: string) {
    super(`${user.username}'s Gists`, TreeItemCollapsibleState.Collapsed);

    if (user.avatarUrl) {
      this.iconPath = Uri.parse(user.avatarUrl);
    } else {
      this.iconPath = {
        dark: path.join(extensionPath, "images/dark/user.svg"),
        light: path.join(extensionPath, "images/light/user.svg")
      };
    }

    this.contextValue = "followedUserGists";
  }
}

export class NoUserGistsNode extends TreeNode {
  constructor() {
    super("This user doesn't have any gists");
  }
}
export class FollowedUserGistNode extends GistNode {
  constructor(
    public gist: Gist,
    extensionPath: string,
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Collapsed
  ) {
    super(gist, extensionPath, collapsibleState);

    this.tooltip = this.getTooltip();
    this.contextValue = this.getContextValue("followedUser.gist");
  }
}
