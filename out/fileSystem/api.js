"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileContents = getFileContents;
exports.updateGistFiles = updateGistFiles;
const axios_1 = require("axios");
const mobx_1 = require("mobx");
const constants_1 = require("../constants");
const store_1 = require("../store");
const actions_1 = require("../store/actions");
const isBinaryPath = require("is-binary-path");
async function getFileContents(file) {
    if (file.truncated || !file.content) {
        const responseType = isBinaryPath(file.filename) ? "arraybuffer" : "text";
        try {
            const { data } = await axios_1.default.get(file.raw_url, {
                responseType,
                transformResponse: (data) => {
                    return data;
                }
            });
            file.content = data;
        }
        catch (error) {
            console.error(`Error fetching file content: ${error.message}`);
            // Fallback: try to fetch content directly from raw_url
            try {
                const response = await fetch(file.raw_url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                file.content = await response.text();
            }
            catch (fallbackError) {
                console.error(`Fallback fetch failed: ${fallbackError.message}`);
                throw new Error(`Failed to fetch file content: ${fallbackError.message}`);
            }
        }
    }
    return file.content;
}
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
    const gist = store_1.store.dailyNotes.gist && store_1.store.dailyNotes.gist.id === id
        ? store_1.store.dailyNotes.gist
        : (store_1.store.gists.find((gist) => gist.id === id) ||
            store_1.store.archivedGists.find((gist) => gist.id === id));
    (0, mobx_1.runInAction)(() => {
        gist.files = body.files;
        gist.updated_at = body.updated_at;
        gist.history = body.history;
    });
    return gist;
}
//# sourceMappingURL=api.js.map