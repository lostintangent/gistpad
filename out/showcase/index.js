"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshShowcase = refreshShowcase;
exports.registerShowcaseModule = registerShowcaseModule;
const axios_1 = require("axios");
const mobx_1 = require("mobx");
const vscode_1 = require("vscode");
const config = require("../config");
const constants_1 = require("../constants");
const store_1 = require("../store");
const actions_1 = require("../store/actions");
const utils_1 = require("../utils");
const store_2 = require("./store");
const tree_1 = require("./tree");
async function refreshShowcase() {
    store_2.store.showcase.isLoading = true;
    return (0, mobx_1.runInAction)(async () => {
        const showcaseUrl = await config.get("showcaseUrl");
        const showcase = await axios_1.default.get(showcaseUrl);
        store_2.store.showcase.categories = showcase.data.categories.map((category) => ({
            title: category.title,
            gists: [],
            _gists: category.gists,
            isLoading: true
        }));
        store_2.store.showcase.isLoading = false;
        return Promise.all(store_2.store.showcase.categories.map(async (category) => {
            // @ts-ignore
            category.gists = (0, utils_1.updateGistTags)(await (0, actions_1.getGists)(category._gists));
            category.isLoading = false;
        }));
    });
}
function registerShowcaseModule(context) {
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.refreshShowcase`, refreshShowcase));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.submitShowcaseEntry`, () => {
        vscode_1.env.openExternal(vscode_1.Uri.parse("https://aka.ms/gistpad-showcase-submission"));
    }));
    (0, tree_1.registerTreeProvider)(context);
    (0, mobx_1.reaction)(() => store_1.store.isSignedIn, (isSignedIn) => {
        if (isSignedIn) {
            refreshShowcase();
        }
    });
}
//# sourceMappingURL=index.js.map