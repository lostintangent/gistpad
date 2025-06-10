"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const vscode_1 = require("vscode");
const constants_1 = require("../../constants");
function getConfigSetting(settingName) {
    return vscode_1.workspace.getConfiguration(constants_1.EXTENSION_NAME).get(`wikis.${settingName}`);
}
exports.config = {
    get dailyDirectName() {
        return getConfigSetting("daily.directoryName");
    },
    get dailyTitleFormat() {
        return getConfigSetting("daily.titleFormat");
    }
};
//# sourceMappingURL=config.js.map