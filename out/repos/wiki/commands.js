"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = void 0;
const vscode_1 = require("vscode");
const constants_1 = require("../../constants");
const utils_1 = require("../../utils");
const fileSystem_1 = require("../fileSystem");
const store_1 = require("../store");
const nodes_1 = require("../tree/nodes");
const utils_2 = require("../utils");
const utils_3 = require("./utils");
const moment = require("moment");
const { titleCase } = require("title-case");
async function createWikiPage(name, repo, filePath) {
    const title = titleCase(name);
    let fileHeading = `# ${title}

`;
    const uri = fileSystem_1.RepoFileSystemProvider.getFileUri(repo.name, filePath);
    return vscode_1.workspace.fs.writeFile(uri, (0, utils_1.stringToByteArray)(fileHeading));
}
function registerCommands(context) {
    // This is a private command that handles dynamically
    // creating wiki documents, when the user auto-completes
    // a new document link that doesn't exist.
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}._createWikiPage`, async (repo, name) => {
        var _a;
        const fileName = (0, utils_3.getPageFilePath)(name);
        await createWikiPage(name, repo, fileName);
        // Automatically save the current, in order to ensure
        // the newly created backlink is discovered.
        await ((_a = vscode_1.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.save());
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.addWikiPage`, async (node) => {
        const repo = (node === null || node === void 0 ? void 0 : node.repo) || store_1.store.wiki;
        const repoName = repo.name;
        const input = vscode_1.window.createInputBox();
        input.title = `Add wiki page (${repoName})`;
        input.prompt = "Enter the name of the new page you'd like to create";
        input.onDidAccept(async () => {
            input.hide();
            if (input.value) {
                const path = (0, utils_3.getPageFilePath)(input.value);
                const filePath = node instanceof nodes_1.RepositoryFileNode
                    ? `${node.file.path}/${path}`
                    : path;
                await (0, utils_1.withProgress)("Adding new page...", async () => createWikiPage(input.value, repo, filePath));
                (0, utils_2.openRepoDocument)(repoName, filePath);
            }
        });
        input.show();
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand(`${constants_1.EXTENSION_NAME}.openTodayPage`, async (node, displayProgress = true) => {
        const sharedMoment = moment();
        const fileName = sharedMoment.format("YYYY-MM-DD");
        const filePath = (0, utils_3.getPageFilePath)(fileName);
        const titleFormat = vscode_1.workspace
            .getConfiguration(constants_1.EXTENSION_NAME)
            .get("wikis.daily.titleFormat", "LL");
        const repo = (node === null || node === void 0 ? void 0 : node.repo) || store_1.store.wiki;
        const repoName = repo.name;
        const pageTitle = sharedMoment.format(titleFormat);
        const uri = fileSystem_1.RepoFileSystemProvider.getFileUri(repoName, filePath);
        const [, file] = fileSystem_1.RepoFileSystemProvider.getRepoInfo(uri);
        if (!file) {
            const writeFile = async () => createWikiPage(pageTitle, repo, filePath);
            if (displayProgress) {
                await (0, utils_1.withProgress)("Adding new page...", writeFile);
            }
            else {
                await writeFile();
            }
        }
        (0, utils_2.openRepoDocument)(repoName, filePath);
    }));
}
exports.registerCommands = registerCommands;
//# sourceMappingURL=commands.js.map