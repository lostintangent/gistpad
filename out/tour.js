"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectTour = exports.onDidEndTour = exports.promptForTour = exports.recordTour = exports.exportTour = exports.endCurrentTour = exports.startTourFromFile = exports.startTour = exports.isCodeTourInstalled = exports.ensureApi = exports.TOUR_FILE = void 0;
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
exports.ensureApi = ensureApi;
async function isCodeTourInstalled() {
    await ensureApi();
    return !!codeTourApi;
}
exports.isCodeTourInstalled = isCodeTourInstalled;
async function startTour(tour, workspaceRoot, startInEditMode = false, canEdit = true) {
    await ensureApi();
    tour.id = `${workspaceRoot.toString()}/${exports.TOUR_FILE}`;
    codeTourApi.startTour(tour, 0, workspaceRoot, startInEditMode, canEdit);
}
exports.startTour = startTour;
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
exports.startTourFromFile = startTourFromFile;
async function endCurrentTour() {
    await ensureApi();
    codeTourApi.endCurrentTour();
}
exports.endCurrentTour = endCurrentTour;
async function exportTour(tour) {
    await ensureApi();
    return codeTourApi.exportTour(tour);
}
exports.exportTour = exportTour;
async function recordTour(workspaceRoot) {
    await ensureApi();
    return codeTourApi.recordTour(workspaceRoot);
}
exports.recordTour = recordTour;
async function promptForTour(workspaceRoot, tours) {
    await ensureApi();
    return codeTourApi.promptForTour(workspaceRoot, tours);
}
exports.promptForTour = promptForTour;
async function onDidEndTour(listener) {
    await ensureApi();
    return codeTourApi.onDidEndTour(listener);
}
exports.onDidEndTour = onDidEndTour;
async function selectTour(tours, workspaceRoot) {
    await ensureApi();
    return codeTourApi.selectTour(tours, workspaceRoot);
}
exports.selectTour = selectTour;
//# sourceMappingURL=tour.js.map