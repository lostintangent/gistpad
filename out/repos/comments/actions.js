"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepoComments = exports.deleteRepoComment = exports.editRepoComment = exports.createRepoComment = void 0;
const actions_1 = require("../../store/actions");
async function createRepoComment(repo, path, body, line) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    const response = await api.post(`/repos/${repo}/commits/HEAD/comments`, {
        body,
        path,
        line
    });
    return response.body;
}
exports.createRepoComment = createRepoComment;
async function editRepoComment(repo, id, body) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    return api.patch(`/repos/${repo}/comments/${id}`, {
        body
    });
}
exports.editRepoComment = editRepoComment;
async function deleteRepoComment(repo, id) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    return api.delete(`/repos/${repo}/comments/${id}`);
}
exports.deleteRepoComment = deleteRepoComment;
async function getRepoComments(repo) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    const response = await api.get(`/repos/${repo}/comments`);
    return response.body;
}
exports.getRepoComments = getRepoComments;
//# sourceMappingURL=actions.js.map