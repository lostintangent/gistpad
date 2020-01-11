import * as moment from "moment";
import * as path from "path";
import { IGistDiff } from "src/gistUpdates";
import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { EXTENSION_ID } from "../constants";
import { Gist, GistFile, IFollowedUser } from "../store";
import { fileNameToUri, getGistDescription, getGistLabel, isNotebookGist, isPlaygroundGist } from "../utils";

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
      command: `${EXTENSION_ID}.openGist`,
      title: "Open Gist.."
    };
  }
}

export class SignInNode extends TreeNode {
  constructor() {
    super("Sign in to view your Gists...");

    this.command = {
      command: `${EXTENSION_ID}.signIn`,
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
      command: `${EXTENSION_ID}.newPublicGist`,
      title: "Create new Gist..."
    };
  }
}

export class GistNode extends TreeNode {
  constructor(public gist: Gist) {
    super(getGistLabel(gist), TreeItemCollapsibleState.Collapsed);

    this.description = getGistDescription(gist);

    this.tooltip = `Description: ${this.label}
Updated: ${moment(gist.updated_at).calendar()}
Created: ${moment(gist.created_at).calendar()}
Type: ${gist.public ? "Public" : "Secret"}`;

    this.contextValue = "gists.gist";

    if (isNotebookGist(gist)) {
      this.contextValue += ".notebook";
    } else if (isPlaygroundGist(gist)) {
      this.contextValue += ".playground";
    }
  }
}

export class GistFileNode extends TreeNode {
  constructor(
    public gist: Gist,
    public file: GistFile,
    private isReadOnly = true
  ) {
    super(file.filename!);

    this.iconPath = ThemeIcon.File;
    this.resourceUri = fileNameToUri(gist.id, file.filename!);
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

export class StarredGistNode extends TreeNode {
  constructor(
    public gist: Gist,
    public section: string,
    public parent: TreeNode,
    public gistDiff?: IGistDiff) {
    super(getGistLabel(gist), TreeItemCollapsibleState.Collapsed);

    this.description = getGistDescription(gist);

    const owner = gist.owner ? gist.owner.login : "Anonymous";
    this.tooltip = `Description: ${this.label}
Updated: ${moment(gist.updated_at).calendar()}
Created: ${moment(gist.created_at).calendar()}
Owner: ${owner}`;

    this.contextValue = "starredGists.gist";

    if (isNotebookGist(gist)) {
      this.contextValue += ".notebook";
    } else if (isPlaygroundGist(gist)) {
      this.contextValue += ".playground";
    }
  }
}

export class FollowedUserGistsNode extends TreeNode {
  constructor(
    public user: IFollowedUser,
    extensionPath: string,
    updatesCount: number
  ) {
    super(`${user.username}'s Gists${updatesCount ? ` (${updatesCount})` : ''}`, TreeItemCollapsibleState.Collapsed);

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

const getGistUpdateIcon = (gistDiff: IGistDiff, extensionPath: string) => {
  switch (gistDiff.changeType) {
    case 'add': {
      return path.join(extensionPath, "images/added-icon.svg");
      break;
    }

    case 'modify': {
      return path.join(extensionPath, "images/modified-icon.svg");
      break;
    }

    case 'remove': {
      return path.join(extensionPath, "images/deleted-icon.svg");
      break;
    }
  }
}

export class FollowedUserGistNode extends TreeNode {
  constructor(
    public gist: Gist,
    public section: string,
    public parent: TreeNode,
    extensionPath: string,
    public gistDiff?: IGistDiff
  ) {
    super(getGistLabel(gist), TreeItemCollapsibleState.Collapsed);

    this.description = getGistDescription(gist);

    const tooltipItems = [
      `Description: ${this.label}`,
      `Updated: ${moment(gist.updated_at).calendar()}`,
      `Created: ${moment(gist.created_at).calendar()}`
    ];

    this.tooltip = tooltipItems.join('\n');

    this.contextValue = "followedUser.gist";

    if (gistDiff) {
      this.iconPath = getGistUpdateIcon(gistDiff, extensionPath);
      this.contextValue += "WithUpdates"
    }

    if (isNotebookGist(gist)) {
      this.contextValue += ".notebook";
    } else if (isPlaygroundGist(gist)) {
      this.contextValue += ".playground";
    }
  }
}
