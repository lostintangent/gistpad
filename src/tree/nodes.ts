import * as moment from "moment";
import * as path from "path";
import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import * as config from "../config";
import {
  ENCODED_DIRECTORY_SEPERATOR,
  EXTENSION_NAME,
  TEMP_GIST_ID
} from "../constants";
import {
  FollowedUser,
  Gist,
  GistFile,
  GistGroupType,
  GistShowcaseCategory,
  GistType,
  GistTypes
} from "../store";
import {
  decodeDirectoryName,
  fileNameToUri,
  getGistDescription,
  getGistLabel,
  isNotebookGist,
  isOwnedGist,
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
    gistType: GistGroupType,
    isPublic: boolean,
    extensionPath: string
  ) => {
    let iconName = gistType;

    if (!isPublic) {
      iconName += "-secret";
    }

    return {
      dark: path.join(extensionPath, `images/dark/${iconName}.svg`),
      light: path.join(extensionPath, `images/light/${iconName}.svg`)
    };
  };

  public getGistTypeIcon = (
    gistType: GistGroupType,
    isPublic: boolean,
    extensionPath: string
  ) => {
    if (!config.get("treeIcons")) {
      return;
    }

    return this.getIconPath(gistType, isPublic, extensionPath);
  };
}

export class OpenGistNode extends TreeNode {
  constructor() {
    super("Open Gist...");

    this.command = {
      command: `${EXTENSION_NAME}.openGist`,
      title: "Open Gist..."
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

export class NewPlaygroundNode extends TreeNode {
  constructor() {
    super("New Playground...");

    this.command = {
      command: `${EXTENSION_NAME}.newPlayground`,
      title: "New Playground..."
    };
  }
}

export class LoadingNode extends TreeNode {
  constructor() {
    super("Loading gists...");
  }
}

export class GistsNode extends TreeNode {
  constructor(gistCount: number, public login: string, extensionPath: string) {
    super("Your Gists", TreeItemCollapsibleState.Expanded);

    this.iconPath = path.join(extensionPath, "images/icon-small.png");
    this.contextValue = "gists";
    this.description = gistCount.toString();
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
  constructor(
    public gist: Gist,
    extensionPath: string,
    showIcon: boolean = true,
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Collapsed
  ) {
    super(getGistLabel(gist, !showIcon), collapsibleState);

    this.description = getGistDescription(gist, !config.get("treeIcons"));

    if (showIcon) {
      this.iconPath = this.getGistTypeIcon(
        gist.type!,
        gist.public,
        extensionPath
      );
    }

    this.tooltip = this.getTooltip(
      `Type: ${gist.public ? "Public" : "Secret"}`
    );

    const context = gist.id === TEMP_GIST_ID ? "tempGist" : "gists.gist";
    this.contextValue = this.getContextValue(context);
  }

  getContextValue(baseContext: string) {
    let contextValue = baseContext;

    if (isNotebookGist(this.gist)) {
      contextValue += ".notebook";
    } else if (isPlaygroundGist(this.gist)) {
      contextValue += ".playground";

      if (Object.keys(this.gist.files).includes(".block")) {
        contextValue += ".block";
      }
    }
    return contextValue;
  }

  getTooltip(suffix?: string) {
    let tooltip = `Description: ${this.label}
Updated: ${moment(this.gist.updated_at).calendar()}
Created: ${moment(this.gist.created_at).calendar()}`;

    if (this.gist.tags && this.gist.tags.length) {
      tooltip += `
Tags: ${this.gist.tags.join(", ")}`;
    }

    if (suffix) {
      tooltip += `
${suffix}`;
    }

    return tooltip;
  }
}

function getFileDisplayName(file: GistFile) {
  if (file.filename?.includes(ENCODED_DIRECTORY_SEPERATOR)) {
    return file.filename.split(ENCODED_DIRECTORY_SEPERATOR)[1];
  }

  return file.filename!;
}

export class GistFileNode extends TreeNode {
  constructor(public gistId: string, public file: GistFile) {
    super(getFileDisplayName(file));

    this.iconPath = ThemeIcon.File;
    this.resourceUri = fileNameToUri(
      gistId,
      decodeDirectoryName(file.filename!)
    );

    this.command = {
      command: "gistpad.openGistFile",
      title: "Open Gist File",
      arguments: [this.resourceUri]
    };

    let contextValue = gistId === TEMP_GIST_ID ? "tempGistFile" : "gistFile";

    if (isOwnedGist(gistId)) {
      contextValue += ".editable";
    }

    this.contextValue = contextValue;
  }
}

export class GistDirectoryNode extends TreeNode {
  constructor(public gist: Gist, public directory: string) {
    super(directory, TreeItemCollapsibleState.Collapsed);

    this.iconPath = ThemeIcon.Folder;

    let contextValue =
      gist.id === TEMP_GIST_ID ? "tempGistDirectory" : "gistDirectory";

    if (isOwnedGist(gist.id)) {
      contextValue += ".editable";
    }

    this.contextValue = contextValue;
  }
}

export class StarredGistsNode extends TreeNode {
  constructor(gistCount: number, extensionPath: string) {
    super("Starred Gists", TreeItemCollapsibleState.Collapsed);

    this.iconPath = path.join(extensionPath, "images/star.svg");
    this.contextValue = "starredGists";
    this.description = gistCount.toString();
  }
}

export class NoStarredGistsNode extends TreeNode {
  constructor() {
    super("No starred Gists");
  }
}

export class StarredGistNode extends GistNode {
  constructor(
    public gist: Gist,
    extensionPath: string,
    showIcon: boolean = true
  ) {
    super(gist, extensionPath, showIcon);

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
    this.description = user.gists.length.toString();
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
    showIcon: boolean = true,
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Collapsed
  ) {
    super(gist, extensionPath, showIcon, collapsibleState);

    this.tooltip = this.getTooltip();
    this.contextValue = this.getContextValue("followedUser.gist");
  }
}

export class LoadingShowcaseNode extends TreeNode {
  constructor() {
    super("Loading showcase...");
  }
}

export class GistGroupNode extends TreeNode {
  constructor(
    public label: string,
    public gists: Gist[],
    public nodeConstructor: new (
      gist: Gist,
      extensionPath: string,
      showIcon?: boolean
    ) => GistNode,
    extensionPath: string,
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Collapsed
  ) {
    super(label, collapsibleState);

    this.contextValue = "gistType";
    this.description = gists.length.toString();

    const iconType = GistTypes.includes(label as GistType)
      ? (label as GistType)
      : "tag";

    this.iconPath = this.getGistTypeIcon(iconType, true, extensionPath);
  }
}

export class GistShowcaseCategoryNode extends TreeNode {
  constructor(public category: GistShowcaseCategory) {
    super(category.title, TreeItemCollapsibleState.Expanded);
    this.contextValue = "showcase.category";
  }
}

export class ScratchGistNode extends TreeNode {
  constructor(public gist: Gist, extensionPath: string) {
    super("Scratch Notes", TreeItemCollapsibleState.Expanded);

    this.contextValue = "scratchGist";
    this.description = Object.keys(gist.files).length.toString();

    this.iconPath = path.join(extensionPath, "images/scratch.svg");
  }
}

export class ScratchGistFileNode extends TreeNode {
  constructor(public gistId: string, public file: GistFile) {
    super(getFileDisplayName(file));

    this.iconPath = ThemeIcon.File;
    this.resourceUri = fileNameToUri(
      gistId,
      decodeDirectoryName(file.filename!)
    );

    this.command = {
      command: "gistpad.openGistFile",
      title: "Open Gist File",
      arguments: [this.resourceUri]
    };

    this.contextValue = "scratchGist.file";
  }
}
