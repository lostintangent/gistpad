"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRepoComment = createRepoComment;
exports.editRepoComment = editRepoComment;
exports.deleteRepoComment = deleteRepoComment;
exports.getRepoComments = getRepoComments;
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
async function editRepoComment(repo, id, body) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    return api.patch(`/repos/${repo}/comments/${id}`, {
        body
    });
}
async function deleteRepoComment(repo, id) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    return api.delete(`/repos/${repo}/comments/${id}`);
}
async function getRepoComments(repo) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    const response = await api.get(`/repos/${repo}/comments`);
    return response.body;
}
//# sourceMappingURL=actions.js.map