"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchivedGistsNode = exports.OpenTodayNoteNode = exports.DailyGistNode = exports.GistGroupNode = exports.FollowedUserGistNode = exports.NoUserGistsNode = exports.FollowedUserGistsNode = exports.StarredGistNode = exports.NoStarredGistsNode = exports.StarredGistsNode = exports.GistDirectoryNode = exports.GistFileNode = exports.GistNode = exports.CreateNewGistNode = exports.GistsNode = exports.LoadingNode = exports.TreeNode = void 0;
const moment = require("moment");
const vscode_1 = require("vscode");
const config = require("../config");
const constants_1 = require("../constants");
const store_1 = require("../store");
const utils_1 = require("../utils");
class TreeNode extends vscode_1.TreeItem {
    constructor(label, collapsibleState = vscode_1.TreeItemCollapsibleState.None) {
        super(label, collapsibleState);
        this.getIconPath = (gistType, isPublic, context) => {
            let iconName = gistType;
            if (!isPublic) {
                iconName += "-secret";
            }
            return (0, utils_1.getIconPath)(context, `${iconName}.svg`);
        };
        this.getGistTypeIcon = (gistType, isPublic, context) => {
            if (!config.get("treeIcons")) {
                return;
            }
            return this.getIconPath(gistType, isPublic, context);
        };
    }
}
exports.TreeNode = TreeNode;
class LoadingNode extends TreeNode {
    constructor() {
        super("Loading gists...");
    }
}
exports.LoadingNode = LoadingNode;
class GistsNode extends TreeNode {
    constructor(gistCount, login, extensionContext) {
        super("Your Gists", vscode_1.TreeItemCollapsibleState.Expanded);
        this.login = login;
        this.iconPath = (0, utils_1.joinPath)(extensionContext, "images/icon-small.png");
        this.contextValue = "gists";
        this.description = gistCount.toString();
    }
}
exports.GistsNode = GistsNode;
class CreateNewGistNode extends TreeNode {
    constructor() {
        super("Create new Gist...");
        this.command = {
            command: `${constants_1.EXTENSION_NAME}.newPublicGist`,
            title: "Create new Gist..."
        };
    }
}
exports.CreateNewGistNode = CreateNewGistNode;
class GistNode extends TreeNode {
    constructor(gist, extensionContext, showIcon = true, collapsibleState = vscode_1.TreeItemCollapsibleState.Collapsed) {
        super((0, utils_1.getGistLabel)(gist, !showIcon), collapsibleState);
        this.gist = gist;
        this.description = (0, utils_1.getGistDescription)(gist, !config.get("treeIcons"));
        if (showIcon) {
            this.iconPath = this.getGistTypeIcon(gist.type, gist.public, extensionContext);
        }
        this.tooltip = this.getTooltip(`Type: ${gist.public ? "Public" : "Secret"}`);
        this.contextValue = this.getContextValue("gists.gist");
    }
    getContextValue(baseContext) {
        let contextValue = baseContext;
        if ((0, utils_1.isNotebookGist)(this.gist)) {
            contextValue += ".notebook";
        }
        else if ((0, utils_1.isSwingGist)(this.gist)) {
            contextValue += ".swing";
            if (Object.keys(this.gist.files).includes(".block")) {
                contextValue += ".block";
            }
        }
        if ((0, utils_1.isArchivedGist)(this.gist)) {
            contextValue += ".archived";
        }
        return contextValue;
    }
    getTooltip(suffix) {
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
exports.GistNode = GistNode;
function getFileDisplayName(file) {
    var _a;
    if ((_a = file.filename) === null || _a === void 0 ? void 0 : _a.includes(constants_1.ENCODED_DIRECTORY_SEPARATOR)) {
        return file.filename.split(constants_1.ENCODED_DIRECTORY_SEPARATOR)[1];
    }
    return file.filename;
}
class GistFileNode extends TreeNode {
    constructor(gistId, file) {
        super(getFileDisplayName(file));
        this.gistId = gistId;
        this.file = file;
        this.iconPath = vscode_1.ThemeIcon.File;
        this.resourceUri = (0, utils_1.fileNameToUri)(gistId, (0, utils_1.decodeDirectoryName)(file.filename));
        this.command = {
            command: "gistpad.openGistFile",
            title: "Open Gist File",
            arguments: [this.resourceUri]
        };
        let contextValue = "gistFile";
        if ((0, utils_1.isOwnedGist)(gistId)) {
            contextValue += ".editable";
        }
        this.contextValue = contextValue;
    }
}
exports.GistFileNode = GistFileNode;
class GistDirectoryNode extends TreeNode {
    constructor(gist, directory) {
        super(directory, vscode_1.TreeItemCollapsibleState.Collapsed);
        this.gist = gist;
        this.directory = directory;
        this.iconPath = vscode_1.ThemeIcon.Folder;
        this.resourceUri = (0, utils_1.fileNameToUri)(gist.id, directory);
        let contextValue = "gistDirectory";
        if ((0, utils_1.isOwnedGist)(gist.id)) {
            contextValue += ".editable";
        }
        this.contextValue = contextValue;
    }
}
exports.GistDirectoryNode = GistDirectoryNode;
class StarredGistsNode extends TreeNode {
    constructor(gistCount, extensionContext) {
        super("Starred Gists", vscode_1.TreeItemCollapsibleState.Expanded);
        this.iconPath = (0, utils_1.joinPath)(extensionContext, "images/star.svg");
        this.contextValue = "starredGists";
        this.description = gistCount.toString();
    }
}
exports.StarredGistsNode = StarredGistsNode;
class NoStarredGistsNode extends TreeNode {
    constructor() {
        super("No starred Gists");
    }
}
exports.NoStarredGistsNode = NoStarredGistsNode;
class StarredGistNode extends GistNode {
    constructor(gist, extensionContext, showIcon = true) {
        super(gist, extensionContext, showIcon);
        this.gist = gist;
        const owner = gist.owner ? gist.owner.login : "Anonymous";
        this.tooltip = this.getTooltip(`Owner: ${owner}`);
        this.contextValue = this.getContextValue("starredGists.gist");
    }
}
exports.StarredGistNode = StarredGistNode;
class FollowedUserGistsNode extends TreeNode {
    constructor(user, extensionContext) {
        super(`${user.username}'s Gists`, vscode_1.TreeItemCollapsibleState.Collapsed);
        this.user = user;
        if (user.avatarUrl) {
            this.iconPath = vscode_1.Uri.parse(user.avatarUrl);
        }
        else {
            this.iconPath = new vscode_1.ThemeIcon("account");
        }
        this.contextValue = "followedUserGists";
        this.description = user.gists.length.toString();
    }
}
exports.FollowedUserGistsNode = FollowedUserGistsNode;
class NoUserGistsNode extends TreeNode {
    constructor() {
        super("This user doesn't have any gists");
    }
}
exports.NoUserGistsNode = NoUserGistsNode;
class FollowedUserGistNode extends GistNode {
    constructor(gist, extensionContext, showIcon = true, collapsibleState = vscode_1.TreeItemCollapsibleState.Collapsed) {
        super(gist, extensionContext, showIcon, collapsibleState);
        this.gist = gist;
        this.tooltip = this.getTooltip();
        this.contextValue = this.getContextValue("followedUser.gist");
    }
}
exports.FollowedUserGistNode = FollowedUserGistNode;
class GistGroupNode extends TreeNode {
    constructor(label, gists, nodeConstructor, extensionContext, collapsibleState = vscode_1.TreeItemCollapsibleState.Collapsed) {
        super(label, collapsibleState);
        this.label = label;
        this.gists = gists;
        this.nodeConstructor = nodeConstructor;
        this.description = gists.length.toString();
        const iconType = store_1.GistTypes.includes(label)
            ? label
            : "tag";
        this.contextValue = `gistType.${iconType}`;
        const iconPath = this.getGistTypeIcon(iconType, true, extensionContext);
        if (iconPath) {
            this.iconPath = iconPath;
        }
    }
}
exports.GistGroupNode = GistGroupNode;
class DailyGistNode extends TreeNode {
    constructor(extensionContext, gist = null) {
        super("Daily Notes", vscode_1.TreeItemCollapsibleState.Expanded);
        this.gist = gist;
        this.contextValue = "dailyGist";
        if (gist) {
            const dailyFileCount = Object.keys(gist.files).filter((file) => file !== constants_1.DAILY_TEMPLATE_FILENAME).length;
            this.description = dailyFileCount.toString();
        }
        else {
            this.description = "";
        }
        this.iconPath = (0, utils_1.joinPath)(extensionContext, "images/daily.svg");
    }
}
exports.DailyGistNode = DailyGistNode;
class OpenTodayNoteNode extends TreeNode {
    constructor() {
        super("Open today's note...");
        this.command = {
            command: `${constants_1.EXTENSION_NAME}.openTodayNote`,
            title: "Open today's note..."
        };
    }
}
exports.OpenTodayNoteNode = OpenTodayNoteNode;
class ArchivedGistsNode extends TreeNode {
    constructor(gistCount) {
        super("Archived Gists", vscode_1.TreeItemCollapsibleState.Collapsed);
        this.iconPath = new vscode_1.ThemeIcon("archive");
        this.contextValue = "archivedGists";
        this.description = gistCount.toString();
    }
}
exports.ArchivedGistsNode = ArchivedGistsNode;
//# sourceMappingURL=nodes.js.map