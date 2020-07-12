import * as moment from "moment";
import {
  ExtensionContext,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Uri
} from "vscode";
import * as config from "../config";
import {
  ENCODED_DIRECTORY_SEPARATOR,
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
  getIconPath,
  isNotebookGist,
  isOwnedGist,
  isPlaygroundGist,
  joinPath
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
    context: ExtensionContext
  ) => {
    let iconName = gistType;

    if (!isPublic) {
      iconName += "-secret";
    }

    return getIconPath(context, `${iconName}.svg`);
  };

  public getGistTypeIcon = (
    gistType: GistGroupType,
    isPublic: boolean,
    context: ExtensionContext
  ) => {
    if (!config.get("treeIcons")) {
      return;
    }

    return this.getIconPath(gistType, isPublic, context);
  };
}

export class LoadingNode extends TreeNode {
  constructor() {
    super("Loading gists...");
  }
}

export class GistsNode extends TreeNode {
  constructor(
    gistCount: number,
    public login: string,
    extensionContext: ExtensionContext
  ) {
    super("Your Gists", TreeItemCollapsibleState.Expanded);

    this.iconPath = joinPath(extensionContext, "images/icon-small.png");
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
    extensionContext: ExtensionContext,
    showIcon: boolean = true,
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Collapsed
  ) {
    super(getGistLabel(gist, !showIcon), collapsibleState);

    this.description = getGistDescription(gist, !config.get("treeIcons"));

    if (showIcon) {
      this.iconPath = this.getGistTypeIcon(
        gist.type!,
        gist.public,
        extensionContext
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
  if (file.filename?.includes(ENCODED_DIRECTORY_SEPARATOR)) {
    return file.filename.split(ENCODED_DIRECTORY_SEPARATOR)[1];
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
  constructor(gistCount: number, extensionContext: ExtensionContext) {
    super("Starred Gists", TreeItemCollapsibleState.Expanded);

    this.iconPath = joinPath(extensionContext, "images/star.svg");
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
    extensionContext: ExtensionContext,
    showIcon: boolean = true
  ) {
    super(gist, extensionContext, showIcon);

    const owner = gist.owner ? gist.owner.login : "Anonymous";
    this.tooltip = this.getTooltip(`Owner: ${owner}`);

    this.contextValue = this.getContextValue("starredGists.gist");
  }
}

export class FollowedUserGistsNode extends TreeNode {
  constructor(public user: FollowedUser, extensionContext: ExtensionContext) {
    super(`${user.username}'s Gists`, TreeItemCollapsibleState.Collapsed);

    if (user.avatarUrl) {
      this.iconPath = Uri.parse(user.avatarUrl);
    } else {
      this.iconPath = {
        dark: joinPath(extensionContext, "images/dark/user.svg"),
        light: joinPath(extensionContext, "images/light/user.svg")
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
    extensionContext: ExtensionContext,
    showIcon: boolean = true,
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Collapsed
  ) {
    super(gist, extensionContext, showIcon, collapsibleState);

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
      extensionContext: ExtensionContext,
      showIcon?: boolean
    ) => GistNode,
    extensionContext: ExtensionContext,
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Collapsed
  ) {
    super(label, collapsibleState);

    this.contextValue = "gistType";
    this.description = gists.length.toString();

    const iconType = GistTypes.includes(label as GistType)
      ? (label as GistType)
      : "tag";

    this.iconPath = this.getGistTypeIcon(iconType, true, extensionContext);
  }
}

export class GistShowcaseCategoryNode extends TreeNode {
  constructor(public category: GistShowcaseCategory) {
    super(category.title, TreeItemCollapsibleState.Expanded);
    this.contextValue = "showcase.category";
  }
}

export class ScratchGistNode extends TreeNode {
  constructor(
    extensionContext: ExtensionContext,
    public gist: Gist | null = null
  ) {
    super("Scratch Notes", TreeItemCollapsibleState.Expanded);

    this.contextValue = "scratchGist";
    this.description = gist ? Object.keys(gist.files).length.toString() : "";

    this.iconPath = joinPath(extensionContext, "images/scratch.svg");
  }
}

export class NewScratchNoteNode extends TreeNode {
  constructor() {
    super("New scratch note...");

    this.command = {
      command: `${EXTENSION_NAME}.newScratchNote`,
      title: "New scratch note..."
    };
  }
}
