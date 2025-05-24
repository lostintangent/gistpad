"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGistFiles = exports.getFileContents = void 0;
const axios_1 = require("axios");
const path = require("path");
const mobx_1 = require("mobx");
const constants_1 = require("../constants");
const store_1 = require("../store");
const actions_1 = require("../store/actions");
const isBinaryPath = require("is-binary-path");
async function getFileContents(file) {
    if (file.truncated || !file.content) {
        const responseType = isBinaryPath(path.basename(file.filename)) ? "arraybuffer" : "text";
        const { data } = await axios_1.default.get(file.raw_url, {
            responseType,
            transformResponse: (data) => {
                return data;
            }
        });
        file.content = data;
    }
    return file.content;
}
exports.getFileContents = getFileContents;
async function updateGistFiles(id, gistFiles) {
    const api = await (0, actions_1.getApi)();
    const files = gistFiles.reduce((accumulator, [filename, file]) => {
        if (file && file.content === "") {
            file.content = constants_1.ZERO_WIDTH_SPACE;
        }
        return {
            ...accumulator,
            [filename]: file
        };
    }, {});
    const { body } = await api.edit(id, { files });
    const gist = store_1.store.scratchNotes.gist && store_1.store.scratchNotes.gist.id === id
        ? store_1.store.scratchNotes.gist
        : (store_1.store.gists.find((gist) => gist.id === id) ||
            store_1.store.archivedGists.find((gist) => gist.id === id));
    (0, mobx_1.runInAction)(() => {
        gist.files = body.files;
        gist.updated_at = body.updated_at;
        gist.history = body.history;
    });
    return gist;
}
exports.updateGistFiles = updateGistFiles;
//# sourceMappingURL=api.js.map