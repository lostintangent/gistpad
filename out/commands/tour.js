"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTourCommands = void 0;
const vscode = require("vscode");
const constants_1 = require("../constants");
const tour_1 = require("../tour");
const editor_1 = require("./editor");
async function registerTourCommands(context) {
    context.subscriptions.push(vscode.commands.registerCommand(`${constants_1.EXTENSION_NAME}.exportTour`, async ({ tour }) => {
        const content = await (0, tour_1.exportTour)(tour);
        (0, editor_1.promptForGistSelection)([{ filename: tour_1.TOUR_FILE, content }]);
    }));
}
exports.registerTourCommands = registerTourCommands;
//# sourceMappingURL=tour.js.map