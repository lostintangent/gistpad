import * as moment from "moment";
import * as path from "path";
import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
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

export class StarredGistNode extends TreeNode {
  constructor(public gist: Gist) {
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

export class FollowedUserGistNode extends TreeNode {
  constructor(public gist: Gist) {
    super(getGistLabel(gist), TreeItemCollapsibleState.Collapsed);

    this.description = getGistDescription(gist);

    this.tooltip = `Description: ${this.label}
Updated: ${moment(gist.updated_at).calendar()}
Created: ${moment(gist.created_at).calendar()}`;

    this.contextValue = "followedUser.gist";

    if (isNotebookGist(gist)) {
      this.contextValue += ".notebook";
    } else if (isPlaygroundGist(gist)) {
      this.contextValue += ".playground";
    }
  }
}
