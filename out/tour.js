"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOUR_FILE = void 0;
exports.ensureApi = ensureApi;
exports.isCodeTourInstalled = isCodeTourInstalled;
exports.startTour = startTour;
exports.startTourFromFile = startTourFromFile;
exports.endCurrentTour = endCurrentTour;
exports.exportTour = exportTour;
exports.recordTour = recordTour;
exports.promptForTour = promptForTour;
exports.onDidEndTour = onDidEndTour;
exports.selectTour = selectTour;
const vscode_1 = require("vscode");
const api_1 = require("./fileSystem/api");
exports.TOUR_FILE = "main.tour";
let codeTourApi;
async function ensureApi() {
    if (!codeTourApi) {
        const codeTour = vscode_1.extensions.getExtension("vsls-contrib.codetour");
        if (!codeTour) {
            return;
        }
        if (!codeTour.isActive) {
            await codeTour.activate();
        }
        codeTourApi = codeTour.exports;
    }
}
async function isCodeTourInstalled() {
    await ensureApi();
    return !!codeTourApi;
}
async function startTour(tour, workspaceRoot, startInEditMode = false, canEdit = true) {
    await ensureApi();
    tour.id = `${workspaceRoot.toString()}/${exports.TOUR_FILE}`;
    codeTourApi.startTour(tour, 0, workspaceRoot, startInEditMode, canEdit);
}
async function startTourFromFile(tourFile, workspaceRoot, startInEditMode = false, canEdit = true) {
    await ensureApi();
    const tourContent = await (0, api_1.getFileContents)(tourFile);
    if (!tourContent) {
        return;
    }
    try {
        const tour = JSON.parse(tourContent);
        startTour(tour, workspaceRoot, startInEditMode, canEdit);
    }
    catch (e) { }
}
async function endCurrentTour() {
    await ensureApi();
    codeTourApi.endCurrentTour();
}
async function exportTour(tour) {
    await ensureApi();
    return codeTourApi.exportTour(tour);
}
async function recordTour(workspaceRoot) {
    await ensureApi();
    return codeTourApi.recordTour(workspaceRoot);
}
async function promptForTour(workspaceRoot, tours) {
    await ensureApi();
    return codeTourApi.promptForTour(workspaceRoot, tours);
}
async function onDidEndTour(listener) {
    await ensureApi();
    return codeTourApi.onDidEndTour(listener);
}
async function selectTour(tours, workspaceRoot) {
    await ensureApi();
    return codeTourApi.selectTour(tours, workspaceRoot);
}
//# sourceMappingURL=tour.js.map