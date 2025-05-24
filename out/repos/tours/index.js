"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTourController = void 0;
const tour_1 = require("../../tour");
const fileSystem_1 = require("../fileSystem");
const store_1 = require("../store");
const commands_1 = require("./commands");
async function registerTourController(context) {
    (0, commands_1.registerTourCommands)(context);
    (0, tour_1.onDidEndTour)((tour) => {
        if (tour.id.startsWith(`${fileSystem_1.REPO_SCHEME}:/`)) {
            store_1.store.isInCodeTour = false;
        }
    });
}
exports.registerTourController = registerTourController;
//# sourceMappingURL=index.js.map