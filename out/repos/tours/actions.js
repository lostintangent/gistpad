"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptForTour = exports.loadRepoTours = void 0;
const vscode = require("vscode");
const tour_1 = require("../../tour");
const fileSystem_1 = require("../fileSystem");
const store_1 = require("../store");
async function loadRepoTours(repository) {
    const workspaceRoot = fileSystem_1.RepoFileSystemProvider.getFileUri(repository.name);
    const tours = [];
    for (let tourPath of repository.tours) {
        const uri = fileSystem_1.RepoFileSystemProvider.getFileUri(repository.name, tourPath);
        const tourContents = await (await vscode.workspace.fs.readFile(uri)).toString();
        const tour = JSON.parse(tourContents);
        tour.id = uri.toString();
        tours.push(tour);
    }
    return [tours, workspaceRoot];
}
exports.loadRepoTours = loadRepoTours;
async function promptForTour(repository) {
    if (repository.hasTours) {
        const [tours, workspaceRoot] = await loadRepoTours(repository);
        const selectedTour = await (0, tour_1.promptForTour)(workspaceRoot, tours);
        if (selectedTour) {
            store_1.store.isInCodeTour = true;
        }
    }
}
exports.promptForTour = promptForTour;
//# sourceMappingURL=actions.js.map