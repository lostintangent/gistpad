"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCodeSwingModule = registerCodeSwingModule;
const mobx_1 = require("mobx");
const vscode = require("vscode");
const vscode_1 = require("vscode");
const constants_1 = require("../constants");
const store_1 = require("../store");
const actions_1 = require("../store/actions");
const utils_1 = require("../utils");
class CodeSwingTemplateProvider {
    constructor() {
        this._onDidChangeTemplate = new vscode.EventEmitter();
        this.onDidChangeTemplates = this._onDidChangeTemplate.event;
    }
    provideTemplates() {
        return store_1.store.gists
            .concat(store_1.store.starredGists)
            .filter((gist) => gist.type === "code-swing-template")
            .map((gist) => ({
            title: gist.description,
            description: (0, utils_1.isOwnedGist)(gist.id) ? "" : gist.owner,
            files: Object.keys(gist.files).map((file) => ({
                filename: file,
                content: gist.files[file].content
            }))
        }));
    }
}
const templateProvider = new CodeSwingTemplateProvider();
function loadSwingManifests() {
    store_1.store.gists
        .concat(store_1.store.starredGists)
        .concat(store_1.store.archivedGists)
        .forEach(async (gist) => {
        const manifest = gist.files[constants_1.SWING_FILE];
        if (manifest) {
            await vscode.workspace.fs.readFile((0, utils_1.fileNameToUri)(gist.id, constants_1.SWING_FILE));
            (0, utils_1.updateGistTags)(gist);
        }
    });
    templateProvider._onDidChangeTemplate.fire();
}
async function newSwing(isPublic) {
    const inputBox = vscode.window.createInputBox();
    inputBox.title = "Create new " + (isPublic ? "" : "secret ") + "swing";
    inputBox.placeholder = "Specify the description of the swing";
    inputBox.onDidAccept(() => {
        inputBox.hide();
        swingApi.newSwing(async (files) => {
            const gist = await (0, actions_1.newGist)(files, isPublic, inputBox.value, false);
            return (0, utils_1.fileNameToUri)(gist.id);
        }, inputBox.title);
    });
    inputBox.show();
}
let swingApi;
async function registerCodeSwingModule(context) {
    (0, mobx_1.reaction)(() => [store_1.store.isSignedIn, store_1.store.isLoading], ([isSignedIn, isLoading]) => {
        if (isSignedIn && !isLoading) {
            loadSwingManifests();
        }
    });
    const extension = vscode_1.extensions.getExtension("codespaces-contrib.codeswing");
    if (!extension) {
        return;
    }
    vscode.commands.executeCommand("setContext", "gistpad:codeSwingEnabled", true);
    if (!extension.isActive) {
        await extension.activate();
    }
    swingApi = extension.exports;
    context.subscriptions.push(vscode.commands.registerCommand(`${constants_1.EXTENSION_NAME}.newSwing`, newSwing.bind(null, true)));
    context.subscriptions.push(vscode.commands.registerCommand(`${constants_1.EXTENSION_NAME}.newSecretSwing`, newSwing.bind(null, false)));
    context.subscriptions.push(vscode.commands.registerCommand(`${constants_1.EXTENSION_NAME}.openGistInBlocks`, async (node) => {
        vscode.env.openExternal(vscode.Uri.parse(`https://bl.ocks.org/${node.gist.owner.login}/${node.gist.id}`));
    }));
    context.subscriptions.push(vscode.commands.registerCommand(`${constants_1.EXTENSION_NAME}.exportGistToCodePen`, async (node) => {
        const uri = (0, utils_1.fileNameToUri)(node.gist.id);
        swingApi.exportSwingToCodePen(uri);
    }));
    swingApi.registerTemplateProvider("gist", templateProvider, {
        title: "Gists",
        description: "Templates provided by your own gists, and gists you've starred."
    });
}
//# sourceMappingURL=index.js.map