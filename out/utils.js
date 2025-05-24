"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isArchivedGist = exports.getIconPath = exports.joinPath = exports.isTutorialGist = exports.isSwingTemplateGist = exports.isSwingGist = exports.isFlashCodeGist = exports.isDiagramGist = exports.isNotebookGist = exports.isTourGist = exports.isNoteGist = exports.uriToFileName = exports.stringToByteArray = exports.updateGistTags = exports.sortGists = exports.getGistDetailsFromUri = exports.fileNameToUri = exports.decodeDirectoryUri = exports.encodeDirectoryUri = exports.decodeDirectoryName = exports.encodeDirectoryName = exports.openGistFile = exports.openGistFiles = exports.openGistAsWorkspace = exports.openGist = exports.isGistWorkspace = exports.isGistDocument = exports.getGistWorkspaceId = exports.getGistLabel = exports.withProgress = exports.getGistDescription = exports.closeGistFiles = exports.showGistQuickPick = exports.isOwnedGist = exports.byteArrayToString = void 0;
const moment = require("moment");
const path = require("path");
const vscode_1 = require("vscode");
const constants_1 = require("./constants");
const store_1 = require("./store");
const actions_1 = require("./store/actions");
const tour_1 = require("./tour");
function byteArrayToString(value) {
    return new TextDecoder().decode(value);
}
exports.byteArrayToString = byteArrayToString;
function isOwnedGist(gistId) {
    var _a;
    return (store_1.store.isSignedIn &&
        (!!store_1.store.gists.find((gist) => gist.id === gistId) ||
            !!((_a = store_1.store.archivedGists) === null || _a === void 0 ? void 0 : _a.find((gist) => gist.id === gistId)) ||
            (store_1.store.scratchNotes.gist ? store_1.store.scratchNotes.gist.id === gistId : false)));
}
exports.isOwnedGist = isOwnedGist;
async function showGistQuickPick(gists, placeHolder) {
    const items = gists.map((gist) => {
        return {
            label: getGistLabel(gist),
            description: getGistDescription(gist),
            id: gist.id
        };
    });
    return vscode_1.window.showQuickPick(items, {
        placeHolder
    });
}
exports.showGistQuickPick = showGistQuickPick;
async function closeGistFiles(gist) {
    vscode_1.window.visibleTextEditors.forEach((editor) => {
        if ((editor.document.uri.scheme === constants_1.FS_SCHEME &&
            editor.document.uri.authority === gist.id) ||
            editor.document.uri.scheme === constants_1.INPUT_SCHEME) {
            editor.hide();
        }
    });
    if (isSwingGist(gist)) {
        //TODO closeWebviewPanel(gist.id);
    }
}
exports.closeGistFiles = closeGistFiles;
function getGistDescription(gist, includeType = true) {
    const maybeSuffix = gist.public ? "" : " (Secret)";
    const suffix = includeType ? maybeSuffix : "";
    return `${moment(gist.updated_at).calendar()}${suffix}`;
}
exports.getGistDescription = getGistDescription;
function withProgress(title, action) {
    return vscode_1.window.withProgress({
        location: vscode_1.ProgressLocation.Notification,
        title
    }, action);
}
exports.withProgress = withProgress;
function getGistLabel(gist, stripTags = false) {
    var _a;
    if (gist.description) {
        let description = gist.description;
        if (stripTags && gist.tags) {
            (_a = gist.tags) === null || _a === void 0 ? void 0 : _a.forEach((tag) => (description = description.replace(`#${tag}`, "")));
        }
        if (isArchivedGist(gist)) {
            description = description.replace(/ \[Archived\]$/, "");
        }
        return description;
    }
    return `${Object.keys(gist.files)[0]}`;
}
exports.getGistLabel = getGistLabel;
function getGistWorkspaceId() {
    return vscode_1.workspace.workspaceFolders[0].uri.authority;
}
exports.getGistWorkspaceId = getGistWorkspaceId;
function isGistDocument(document) {
    return document.uri.scheme === constants_1.FS_SCHEME;
}
exports.isGistDocument = isGistDocument;
function isGistWorkspace() {
    return (vscode_1.workspace.workspaceFolders &&
        vscode_1.workspace.workspaceFolders.length > 0 &&
        vscode_1.workspace.workspaceFolders[0].uri.scheme === constants_1.FS_SCHEME);
}
exports.isGistWorkspace = isGistWorkspace;
async function openGist(id, openAsWorkspace, forceNewWindow) {
    if (openAsWorkspace) {
        return openGistAsWorkspace(id, !!forceNewWindow);
    }
    return openGistFiles(id);
}
exports.openGist = openGist;
function openGistAsWorkspace(id, forceNewWindow) {
    // TODO: Add support for adding the Gist as a new
    // root to an existing workspace
    const uri = vscode_1.Uri.parse(`${constants_1.FS_SCHEME}://${id}/`);
    vscode_1.commands.executeCommand("vscode.openFolder", uri, forceNewWindow);
}
exports.openGistAsWorkspace = openGistAsWorkspace;
async function openGistFiles(id) {
    try {
        const gist = store_1.store.gists.find((gist) => gist.id === id) ||
            store_1.store.archivedGists.find((gist) => gist.id === id) ||
            store_1.store.starredGists.find((gist) => gist.id === id) ||
            (await (0, actions_1.getGist)(id));
        if (isSwingGist(gist) &&
            vscode_1.extensions.getExtension("codespaces-contrib.codeswing")) {
            // TODO: Cleanup this code
            const extension = vscode_1.extensions.getExtension("codespaces-contrib.codeswing");
            if (extension.isActive) {
                await (extension === null || extension === void 0 ? void 0 : extension.activate());
            }
            const uri = vscode_1.Uri.parse(`${constants_1.FS_SCHEME}://${id}/`);
            extension === null || extension === void 0 ? void 0 : extension.exports.openSwing(uri);
        }
        else if (isTourGist(gist) && (await (0, tour_1.isCodeTourInstalled)())) {
            const canEdit = isOwnedGist(gist.id);
            const tourFile = gist.files[tour_1.TOUR_FILE];
            (0, tour_1.startTourFromFile)(tourFile, vscode_1.Uri.parse(""), false, canEdit);
        }
        else {
            Object.entries(gist.files)
                .reverse()
                .forEach(async ([_, file], index) => {
                const uri = decodeDirectoryUri(fileNameToUri(id, file.filename));
                openGistFile(uri);
            });
        }
    }
    catch (e) {
        vscode_1.window.showErrorMessage(`The specified gist doesn't exist: "${id}". Please check the spelling and try again.`);
    }
}
exports.openGistFiles = openGistFiles;
async function openGistFile(uri, allowPreview = true) {
    vscode_1.commands.executeCommand("vscode.open", uri, {
        preview: true,
        viewColumn: vscode_1.ViewColumn.Active
    });
}
exports.openGistFile = openGistFile;
function encodeDirectoryName(filename) {
    return filename.replace(constants_1.DIRECTORY_SEPARATOR, constants_1.ENCODED_DIRECTORY_SEPARATOR);
}
exports.encodeDirectoryName = encodeDirectoryName;
function decodeDirectoryName(filename) {
    return filename.replace(constants_1.ENCODED_DIRECTORY_SEPARATOR, constants_1.DIRECTORY_SEPARATOR);
}
exports.decodeDirectoryName = decodeDirectoryName;
function encodeDirectoryUri(uri) {
    if (uri.path.substr(1).includes(constants_1.DIRECTORY_SEPARATOR)) {
        return uri.with({
            path: `${constants_1.DIRECTORY_SEPARATOR}${uri.path
                .substr(1)
                .replace(constants_1.DIRECTORY_SEPARATOR, constants_1.ENCODED_DIRECTORY_SEPARATOR)}`
        });
    }
    return uri;
}
exports.encodeDirectoryUri = encodeDirectoryUri;
function decodeDirectoryUri(uri) {
    if (uri.path.includes(constants_1.ENCODED_DIRECTORY_SEPARATOR)) {
        return uri.with({
            path: uri.path.replace(constants_1.ENCODED_DIRECTORY_SEPARATOR, constants_1.DIRECTORY_SEPARATOR)
        });
    }
    return uri;
}
exports.decodeDirectoryUri = decodeDirectoryUri;
function fileNameToUri(gistId, filename = "") {
    return vscode_1.Uri.parse(`${constants_1.FS_SCHEME}://${gistId}/${encodeURIComponent(filename)}`);
}
exports.fileNameToUri = fileNameToUri;
function getGistDetailsFromUri(uri) {
    const pathWithoutPrefix = uri.path.substr(1);
    const directory = pathWithoutPrefix.includes(constants_1.DIRECTORY_SEPARATOR)
        ? pathWithoutPrefix.split(constants_1.DIRECTORY_SEPARATOR)[0]
        : "";
    return {
        gistId: uri.authority,
        directory: decodeURIComponent(directory),
        file: decodeURIComponent(path.basename(uri.path))
    };
}
exports.getGistDetailsFromUri = getGistDetailsFromUri;
function sortGists(gists) {
    if (store_1.store.sortOrder === store_1.SortOrder.alphabetical) {
        return gists
            .slice()
            .sort((a, b) => getGistLabel(a).localeCompare(getGistLabel(b)));
    }
    else {
        return gists
            .slice()
            .sort((a, b) => Date.parse(b.updated_at || b.created_at) -
            Date.parse(a.updated_at || a.created_at));
    }
}
exports.sortGists = sortGists;
// TODO Convert this into a computed property
// on the gist object itself
const TAG_PATTERN = /\s+#[\w\d-]+\b(?!\s+[^#])/gi;
function updateGistTags(gist) {
    const gists = Array.isArray(gist) ? gist : [gist];
    return gists.map((gist) => {
        if (isSwingTemplateGist(gist)) {
            gist.type = "code-swing-template";
        }
        else if (isTutorialGist(gist)) {
            gist.type = "code-swing-tutorial";
        }
        else if (isSwingGist(gist)) {
            gist.type = "code-swing";
        }
        else if (isNotebookGist(gist)) {
            gist.type = "notebook";
        }
        else if (isNoteGist(gist)) {
            gist.type = "note";
        }
        else if (isTourGist(gist)) {
            gist.type = "code-tour";
        }
        else if (isDiagramGist(gist)) {
            gist.type = "diagram";
        }
        else if (isFlashCodeGist(gist)) {
            gist.type = "flash-code";
        }
        else {
            gist.type = "code-snippet";
        }
        const tags = gist.description ? gist.description.match(TAG_PATTERN) : null;
        gist.tags = tags ? tags.map((tag) => tag.trim().substr(1)) : [];
        return gist;
    });
}
exports.updateGistTags = updateGistTags;
function stringToByteArray(value) {
    return new TextEncoder().encode(value);
}
exports.stringToByteArray = stringToByteArray;
function uriToFileName(uri) {
    return decodeURIComponent(path.basename(uri.toString()));
}
exports.uriToFileName = uriToFileName;
const IMAGE_EXTENSIONS = [".png", ".tldraw"];
const METADATA_EXTENSIONS = [".yml", ".json"];
const DOCUMENT_EXTENSIONS = [".adoc", ".md", ".markdown", ".txt"];
const ALL_DOCUMENT_EXTENSIONS = [
    ...IMAGE_EXTENSIONS,
    ...METADATA_EXTENSIONS,
    ...DOCUMENT_EXTENSIONS
];
function isNoteGist(gist) {
    const gistFiles = Object.keys(gist.files);
    const includesDocument = gistFiles.some((file) => DOCUMENT_EXTENSIONS.includes(path.extname(file)));
    return (includesDocument &&
        gistFiles.every((file) => ALL_DOCUMENT_EXTENSIONS.includes(path.extname(file))));
}
exports.isNoteGist = isNoteGist;
function isTourGist(gist) {
    const files = Object.keys(gist.files);
    return files.length === 1 && files[0] === tour_1.TOUR_FILE;
}
exports.isTourGist = isTourGist;
function isNotebookGist(gist) {
    return Object.keys(gist.files).some((file) => path.extname(file) === ".ipynb");
}
exports.isNotebookGist = isNotebookGist;
function isDiagramGist(gist) {
    return Object.keys(gist.files).some((file) => file.includes(".drawio"));
}
exports.isDiagramGist = isDiagramGist;
function isFlashCodeGist(gist) {
    return Object.keys(gist.files).some((file) => file.includes(".deck"));
}
exports.isFlashCodeGist = isFlashCodeGist;
function isSwingGist(gist) {
    const gistFiles = Object.keys(gist.files);
    // TODO: Replace this with a CodeSwing API
    return (gistFiles.includes(constants_1.SWING_FILE) ||
        gistFiles.some((file) => ["index.html", "index.pug"].includes(file)) ||
        gistFiles.includes("scripts") ||
        (gistFiles.includes("script.js") &&
            gistFiles.some((file) => path.extname(file) === ".markdown")));
}
exports.isSwingGist = isSwingGist;
function isSwingTemplateGist(gist) {
    const swingManifest = gist.files[constants_1.SWING_FILE];
    if (!swingManifest) {
        return false;
    }
    try {
        const content = JSON.parse(swingManifest.content || "{}");
        if (content.template) {
            return true;
        }
    }
    catch {
        return false;
    }
}
exports.isSwingTemplateGist = isSwingTemplateGist;
function isTutorialGist(gist) {
    const swingManifest = gist.files[constants_1.SWING_FILE];
    if (!swingManifest) {
        return false;
    }
    try {
        const content = JSON.parse(swingManifest.content || "{}");
        return content.tutorial;
    }
    catch {
        return false;
    }
}
exports.isTutorialGist = isTutorialGist;
function joinPath(context, fragment) {
    let uri;
    // @ts-ignore
    if (context.extensionUri) {
        // @ts-ignore
        uri = vscode_1.Uri.joinPath(context.extensionUri, fragment);
    }
    else {
        uri = path.join(context.extensionPath, fragment);
    }
    return uri;
}
exports.joinPath = joinPath;
function getIconPath(context, iconName) {
    return {
        dark: joinPath(context, `images/dark/${iconName}`),
        light: joinPath(context, `images/light/${iconName}`)
    };
}
exports.getIconPath = getIconPath;
function isArchivedGist(gist) {
    var _a;
    return !!((_a = gist.description) === null || _a === void 0 ? void 0 : _a.endsWith(" [Archived]"));
}
exports.isArchivedGist = isArchivedGist;
//# sourceMappingURL=utils.js.map