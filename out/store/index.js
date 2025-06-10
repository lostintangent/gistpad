"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = exports.GroupType = exports.SortOrder = exports.GistTypes = void 0;
const mobx_1 = require("mobx");
exports.GistTypes = [
    "code-snippet",
    "note",
    "code-swing",
    "code-swing-template",
    "notebook",
    "code-swing-tutorial",
    "code-tour",
    "diagram",
    "flash-code"
];
var SortOrder;
(function (SortOrder) {
    SortOrder["alphabetical"] = "alphabetical";
    SortOrder["updatedTime"] = "updatedTime";
})(SortOrder || (exports.SortOrder = SortOrder = {}));
var GroupType;
(function (GroupType) {
    GroupType["none"] = "none";
    GroupType["tag"] = "tag";
    GroupType["tagAndType"] = "tagAndType";
})(GroupType || (exports.GroupType = GroupType = {}));
exports.store = (0, mobx_1.observable)({
    dailyNotes: {
        gist: null,
        show: false
    },
    followedUsers: [],
    gists: [],
    archivedGists: [],
    isLoading: false,
    isSignedIn: false,
    login: "",
    sortOrder: SortOrder.updatedTime,
    groupType: GroupType.none,
    starredGists: [],
    canCreateRepos: false,
    canDeleteRepos: false,
    unsyncedFiles: new Set()
});
//# sourceMappingURL=index.js.map