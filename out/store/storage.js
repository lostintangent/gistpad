"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.followedUsersStorage = void 0;
exports.initializeStorage = initializeStorage;
const mobx_1 = require("mobx");
const vscode_1 = require("vscode");
const _1 = require(".");
const config = require("../config");
const constants_1 = require("../constants");
const extension_1 = require("../extension");
const FOLLOW_KEY = "gistpad.followedUsers";
// TODO: Replace these with user settings
const SORT_ORDER_KEY = "gistpad:sortOrder";
const GROUP_TYPE_KEY = "gistpad:groupType";
const SHOW_DAILY_NOTES_KEY = "dailyNotes.show";
function updateSortOrder(context, sortOrder) {
    context.globalState.update(SORT_ORDER_KEY, sortOrder);
    vscode_1.commands.executeCommand("setContext", SORT_ORDER_KEY, sortOrder);
}
function updateGroupType(context, groupType) {
    context.globalState.update(GROUP_TYPE_KEY, groupType);
    vscode_1.commands.executeCommand("setContext", GROUP_TYPE_KEY, groupType);
}
async function initializeStorage(context) {
    exports.followedUsersStorage = {
        get followedUsers() {
            let followedUsers = context.globalState.get(FOLLOW_KEY, []).sort();
            extension_1.output === null || extension_1.output === void 0 ? void 0 : extension_1.output.appendLine(`Getting followed users from global state = ${followedUsers}`, extension_1.output.messageType.Info);
            return followedUsers;
        },
        set followedUsers(followedUsers) {
            extension_1.output === null || extension_1.output === void 0 ? void 0 : extension_1.output.appendLine(`Setting followed users to ${followedUsers}`, extension_1.output.messageType.Info);
            context.globalState.update(FOLLOW_KEY, followedUsers);
        }
    };
    const sortOrder = context.globalState.get(SORT_ORDER_KEY, _1.SortOrder.updatedTime);
    _1.store.sortOrder = sortOrder;
    vscode_1.commands.executeCommand("setContext", SORT_ORDER_KEY, sortOrder);
    (0, mobx_1.reaction)(() => [_1.store.sortOrder], () => updateSortOrder(context, _1.store.sortOrder));
    const groupType = context.globalState.get(GROUP_TYPE_KEY, _1.GroupType.none);
    _1.store.groupType = groupType;
    vscode_1.commands.executeCommand("setContext", GROUP_TYPE_KEY, groupType);
    (0, mobx_1.reaction)(() => [_1.store.groupType], () => updateGroupType(context, _1.store.groupType));
    _1.store.dailyNotes.show = await config.get(SHOW_DAILY_NOTES_KEY);
    vscode_1.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration(`${constants_1.EXTENSION_NAME}.${SHOW_DAILY_NOTES_KEY}`)) {
            _1.store.dailyNotes.show = await config.get(SHOW_DAILY_NOTES_KEY);
        }
    });
}
//# sourceMappingURL=storage.js.map