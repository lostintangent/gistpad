"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unarchiveGist = exports.archiveGist = exports.unstarGist = exports.starGist = exports.refreshGist = exports.unfollowUser = exports.starredGists = exports.refreshGists = exports.clearScratchNotes = exports.newScratchNote = exports.newGist = exports.listUserGists = exports.listGists = exports.getGistComments = exports.getGists = exports.getGist = exports.getForks = exports.forkGist = exports.followUser = exports.editGistComment = exports.deleteGistComment = exports.deleteGist = exports.createGistComment = exports.changeDescription = exports.getUserAvatar = exports.getUser = exports.duplicateGist = exports.getApi = void 0;
const mobx_1 = require("mobx");
const vscode_1 = require("vscode");
const _1 = require(".");
const config = require("../config");
const constants_1 = require("../constants");
const utils_1 = require("../utils");
const auth_1 = require("./auth");
const storage_1 = require("./storage");
const moment = require("moment");
const Gists = require("gists");
async function getApi(constructor = Gists) {
    const token = await (0, auth_1.getToken)();
    return new constructor({ token });
}
exports.getApi = getApi;
async function duplicateGist(id, isPublic = true, description, saveGist = true) {
    const gist = await getGist(id);
    const files = [];
    for (const filename of Object.keys(gist.files)) {
        const content = (0, utils_1.byteArrayToString)(await vscode_1.workspace.fs.readFile((0, utils_1.fileNameToUri)(gist.id, filename)));
        files.push({
            filename,
            content
        });
    }
    return newGist(files, isPublic, description || gist.description, true);
}
exports.duplicateGist = duplicateGist;
async function getUser(username) {
    const GitHub = require("github-base");
    const api = await getApi(GitHub);
    try {
        const response = await api.get(`/users/${username}`);
        return response.body;
    }
    catch (e) {
        return null;
    }
}
exports.getUser = getUser;
async function getUserAvatar(username) {
    const user = await getUser(username);
    return user ? user.avatar_url : null;
}
exports.getUserAvatar = getUserAvatar;
async function changeDescription(id, description) {
    const api = await getApi();
    const { body } = await api.edit(id, {
        description
    });
    const gist = _1.store.gists.find((gist) => gist.id === id) ||
        _1.store.archivedGists.find((gist) => gist.id === id);
    (0, mobx_1.runInAction)(() => {
        gist.description = body.description;
        gist.updated_at = body.updated_at;
    });
    (0, utils_1.updateGistTags)(gist);
}
exports.changeDescription = changeDescription;
async function createGistComment(id, body) {
    const api = await getApi();
    const gist = await api.createComment(id, { body });
    return gist.body;
}
exports.createGistComment = createGistComment;
async function deleteGist(id) {
    const api = await getApi();
    await api.delete(id);
    _1.store.gists = _1.store.gists.filter((gist) => gist.id !== id);
    _1.store.archivedGists = _1.store.archivedGists.filter((gist) => gist.id !== id);
}
exports.deleteGist = deleteGist;
async function deleteGistComment(gistId, commentId) {
    const api = await getApi();
    await api.deleteComment(gistId, commentId);
}
exports.deleteGistComment = deleteGistComment;
async function editGistComment(gistId, commentId, body) {
    const api = await getApi();
    await api.editComment(gistId, commentId, { body });
}
exports.editGistComment = editGistComment;
async function followUser(username) {
    const avatarUrl = await getUserAvatar(username);
    if (!avatarUrl) {
        vscode_1.window.showErrorMessage(`"${username}" doesn't appear to be a valid GitHub user. Please try again.`);
        return;
    }
    const followedUsers = storage_1.followedUsersStorage.followedUsers;
    if (followedUsers.find((user) => user === username)) {
        vscode_1.window.showInformationMessage("You're already following this user");
        return;
    }
    else {
        followedUsers.push(username);
        storage_1.followedUsersStorage.followedUsers = followedUsers;
    }
    const user = (0, mobx_1.observable)({
        username,
        avatarUrl,
        gists: [],
        isLoading: true
    });
    _1.store.followedUsers.push(user);
    user.gists = await (0, utils_1.updateGistTags)(await listUserGists(username));
    user.isLoading = false;
}
exports.followUser = followUser;
async function forkGist(id) {
    const api = await getApi();
    const gist = await api.fork(id);
    (0, utils_1.updateGistTags)(gist.body);
    _1.store.gists.unshift(gist.body);
    (0, utils_1.openGistFiles)(gist.body.id);
}
exports.forkGist = forkGist;
async function getForks(id) {
    const api = await getApi();
    const response = await api.forks(id);
    return response.body.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
}
exports.getForks = getForks;
async function getGist(id) {
    const api = await getApi();
    const gist = await api.get(id);
    return (0, mobx_1.observable)(gist.body);
}
exports.getGist = getGist;
async function getGists(ids) {
    return Promise.all(ids.map(getGist));
}
exports.getGists = getGists;
async function getGistComments(id) {
    const api = await getApi();
    const response = await api.listComments(id);
    return response.body;
}
exports.getGistComments = getGistComments;
async function listGists() {
    const api = await getApi();
    const { pages } = await api.all();
    const gists = await pages.reduce((result, page) => [...result, ...page.body], []);
    return (0, utils_1.sortGists)(gists);
}
exports.listGists = listGists;
async function listUserGists(username) {
    // api.list unfortunately does not support pagination (it does support page size but it only returns the first page),
    // we need to call the GitHub API directly
    // https://docs.github.com/en/rest/reference/gists#list-public-gists
    // @investigate: should we cap how many gists are fetched and provide a way to load more? It theory, users with hundreds of gists could be problematic to handle if we try to load all gists at once
    const GitHub = require("github-base");
    const api = await getApi(GitHub);
    let page = 1;
    let responseBody = [];
    let getNextPage = true;
    let linkIndex = 0;
    while (getNextPage) {
        const response = await api.get(`/users/${username}/gists?per_page=100&page=${page}`);
        responseBody = [...responseBody, ...response.body];
        if (responseBody.length === 0) {
            getNextPage = false;
        }
        page++;
        linkIndex = response.rawHeaders.indexOf("Link") + 1;
        let nextIndex = response.rawHeaders[linkIndex].indexOf('rel="next"');
        if (nextIndex === -1) {
            getNextPage = false;
        }
    }
    return responseBody.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
}
exports.listUserGists = listUserGists;
async function newGist(gistFiles, isPublic, description, openAfterCreation = true) {
    const api = await getApi();
    const files = gistFiles.reduce((accumulator, gistFile) => {
        return {
            ...accumulator,
            [gistFile.filename.trim()]: {
                content: gistFile.content || constants_1.ZERO_WIDTH_SPACE
            }
        };
    }, {});
    const rawGist = await api.create({
        description,
        public: isPublic,
        files
    });
    const gist = rawGist.body;
    (0, utils_1.updateGistTags)(gist);
    _1.store.gists.unshift(gist);
    if (openAfterCreation) {
        (0, utils_1.openGistFiles)(gist.id);
    }
    return gist;
}
exports.newGist = newGist;
async function newScratchNote(displayProgress = true) {
    const directoryFormat = config.get("scratchNotes.directoryFormat");
    const fileFormat = config.get("scratchNotes.fileFormat");
    const extension = config.get("scratchNotes.fileExtension");
    const sharedMoment = moment();
    const directory = directoryFormat
        ? `${sharedMoment.format(directoryFormat)}${constants_1.DIRECTORY_SEPARATOR}`
        : "";
    const file = sharedMoment.format(fileFormat);
    const filename = `${directory}${file}${extension}`;
    if (!_1.store.scratchNotes.gist) {
        const api = await getApi();
        const response = await api.create({
            description: constants_1.SCRATCH_GIST_NAME,
            public: false,
            files: {
                [(0, utils_1.encodeDirectoryName)(filename)]: {
                    content: constants_1.ZERO_WIDTH_SPACE
                }
            }
        });
        _1.store.scratchNotes.gist = response.body;
    }
    else if (!_1.store.scratchNotes.gist.files.hasOwnProperty(filename)) {
        const writeFile = async () => vscode_1.workspace.fs.writeFile((0, utils_1.fileNameToUri)(_1.store.scratchNotes.gist.id, filename), (0, utils_1.stringToByteArray)(""));
        if (displayProgress) {
            await (0, utils_1.withProgress)("Creating scratch note...", writeFile);
        }
        else {
            await writeFile();
        }
    }
    const uri = (0, utils_1.fileNameToUri)(_1.store.scratchNotes.gist.id, filename);
    vscode_1.window.showTextDocument(uri);
}
exports.newScratchNote = newScratchNote;
async function clearScratchNotes() {
    const api = await getApi();
    await api.delete(_1.store.scratchNotes.gist.id);
    (0, utils_1.closeGistFiles)(_1.store.scratchNotes.gist);
    _1.store.scratchNotes.gist = null;
}
exports.clearScratchNotes = clearScratchNotes;
async function refreshGists() {
    _1.store.isLoading = true;
    const gists = (0, utils_1.updateGistTags)(await listGists());
    _1.store.scratchNotes.gist =
        gists.find((gist) => gist.description === constants_1.SCRATCH_GIST_NAME) || null;
    // Filter out scratch notes and split gists into archived and non-archived
    const nonScratchGists = gists.filter((gist) => gist.description !== constants_1.SCRATCH_GIST_NAME);
    // Split gists into archived and non-archived
    _1.store.archivedGists = nonScratchGists.filter(utils_1.isArchivedGist);
    _1.store.gists = nonScratchGists.filter((gist) => !(0, utils_1.isArchivedGist)(gist));
    _1.store.isLoading = false;
    _1.store.starredGists = (0, utils_1.updateGistTags)(await starredGists());
    if (storage_1.followedUsersStorage.followedUsers.length > 0) {
        _1.store.followedUsers = storage_1.followedUsersStorage.followedUsers.map((username) => ({
            username,
            gists: [],
            isLoading: true
        }));
        for (const followedUser of _1.store.followedUsers) {
            followedUser.avatarUrl = await getUserAvatar(followedUser.username);
            followedUser.gists = (0, utils_1.updateGistTags)(await listUserGists(followedUser.username));
            followedUser.isLoading = false;
        }
    }
}
exports.refreshGists = refreshGists;
async function starredGists() {
    const api = await getApi();
    const { body } = await api.starred();
    return body;
}
exports.starredGists = starredGists;
async function unfollowUser(username) {
    storage_1.followedUsersStorage.followedUsers =
        storage_1.followedUsersStorage.followedUsers.filter((user) => user !== username);
    _1.store.followedUsers = _1.store.followedUsers.filter((user) => user.username !== username);
}
exports.unfollowUser = unfollowUser;
async function refreshGist(id) {
    const gist = await getGist(id);
    const oldGist = (0, utils_1.isArchivedGist)(gist)
        ? _1.store.archivedGists.find((g) => g.id === id)
        : _1.store.gists.find((gist) => gist.id === id);
    (0, mobx_1.set)(oldGist, gist);
}
exports.refreshGist = refreshGist;
async function starGist(gist) {
    const api = await getApi();
    await api.star(gist.id);
    _1.store.starredGists.push(gist);
}
exports.starGist = starGist;
async function unstarGist(id) {
    const api = await getApi();
    await api.unstar(id);
    _1.store.starredGists = _1.store.starredGists.filter((gist) => gist.id !== id);
}
exports.unstarGist = unstarGist;
async function archiveGist(id) {
    const gist = _1.store.gists.find((g) => g.id === id);
    if (!gist)
        return;
    const updatedDescription = `${gist.description} [Archived]`;
    await changeDescription(id, updatedDescription);
    _1.store.archivedGists.push(gist);
    _1.store.gists = _1.store.gists.filter((g) => g.id !== id);
}
exports.archiveGist = archiveGist;
async function unarchiveGist(id) {
    const gist = _1.store.archivedGists.find((g) => g.id === id);
    if (!gist)
        return;
    const updatedDescription = gist.description.replace(/ \[Archived\]$/, "");
    await changeDescription(id, updatedDescription);
    _1.store.gists.push(gist);
    _1.store.archivedGists = _1.store.archivedGists.filter((g) => g.id !== id);
}
exports.unarchiveGist = unarchiveGist;
//# sourceMappingURL=actions.js.map