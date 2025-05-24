"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = exports.Repository = exports.RepositoryFile = void 0;
const mobx_1 = require("mobx");
const path = require("path");
const constants_1 = require("../../constants");
const store_1 = require("../../store");
const fileSystem_1 = require("../fileSystem");
const utils_1 = require("../wiki/utils");
class RepositoryFile {
    constructor(repo, treeItem, tree, parent) {
        this.repo = repo;
        this.treeItem = treeItem;
        this.parent = parent;
        this.tree = tree;
        this.isDirectory = treeItem.type === "tree";
        this.path = treeItem.path;
        this.size = treeItem.size;
        this.sha = treeItem.sha;
        this.mode = treeItem.mode;
        this.uri = fileSystem_1.RepoFileSystemProvider.getFileUri(repo.name, this.path);
    }
    get name() {
        return this.treeItem.displayName || path.basename(this.path);
    }
    get files() {
        if (this.isDirectory) {
            return this.tree.tree
                .filter((item) => {
                const pathPrefix = `${this.path}/`;
                return (item.path.startsWith(pathPrefix) &&
                    item.path.replace(pathPrefix, "").indexOf("/") === -1);
            })
                .sort((a, b) => {
                return b.type.localeCompare(a.type);
            })
                .map((item) => new RepositoryFile(this.repo, item, this.tree, this));
        }
    }
    get comments() {
        return this.repo.comments.filter((comment) => comment.path === this.path);
    }
    get backLinks() {
        return this.treeItem.backLinks;
    }
}
exports.RepositoryFile = RepositoryFile;
__decorate([
    mobx_1.observable
], RepositoryFile.prototype, "tree", void 0);
__decorate([
    mobx_1.computed
], RepositoryFile.prototype, "name", null);
__decorate([
    mobx_1.computed
], RepositoryFile.prototype, "files", null);
__decorate([
    mobx_1.computed
], RepositoryFile.prototype, "comments", null);
__decorate([
    mobx_1.computed
], RepositoryFile.prototype, "backLinks", null);
class Repository {
    constructor(fullName, defaultBranch) {
        this.fullName = fullName;
        this.defaultBranch = defaultBranch;
        this.isLoading = true;
        this.latestCommit = "";
        this.comments = [];
        this.threads = [];
        if (this.fullName.includes("#")) {
            const parts = this.fullName.split("#");
            this.name = parts[0];
            this.branch = parts[1];
        }
        else {
            this.name = fullName;
            this.branch = defaultBranch;
        }
    }
    get files() {
        var _a;
        return (_a = this.tree) === null || _a === void 0 ? void 0 : _a.tree.filter((item) => !item.path.includes("/")).sort((a, b) => {
            return b.type.localeCompare(a.type);
        }).map((item) => new RepositoryFile(this, item, this.tree));
    }
    get readme() {
        var _a, _b;
        return (_b = (_a = this.tree) === null || _a === void 0 ? void 0 : _a.tree.find((item) => item.path.toLocaleLowerCase() === "readme.md")) === null || _b === void 0 ? void 0 : _b.path;
    }
    get hasTours() {
        return this.tours.length > 0;
    }
    get documents() {
        var _a;
        return ((_a = this.tree) === null || _a === void 0 ? void 0 : _a.tree.filter((item) => item.path.endsWith(".md"))) || [];
    }
    get isWiki() {
        return (0, utils_1.isWiki)(this);
    }
    get isSwing() {
        var _a;
        return !!((_a = this.tree) === null || _a === void 0 ? void 0 : _a.tree.find((item) => item.path === constants_1.SWING_FILE));
    }
    get tours() {
        var _a;
        return (((_a = this.tree) === null || _a === void 0 ? void 0 : _a.tree.filter((item) => item.path.startsWith(".tours/")).map((item) => item.path)) || []);
    }
}
exports.Repository = Repository;
__decorate([
    mobx_1.observable
], Repository.prototype, "isLoading", void 0);
__decorate([
    mobx_1.observable
], Repository.prototype, "tree", void 0);
__decorate([
    mobx_1.computed
], Repository.prototype, "files", null);
__decorate([
    mobx_1.computed
], Repository.prototype, "readme", null);
__decorate([
    mobx_1.computed
], Repository.prototype, "hasTours", null);
__decorate([
    mobx_1.computed
], Repository.prototype, "documents", null);
__decorate([
    mobx_1.computed
], Repository.prototype, "isWiki", null);
__decorate([
    mobx_1.computed
], Repository.prototype, "isSwing", null);
__decorate([
    mobx_1.computed
], Repository.prototype, "tours", null);
exports.store = (0, mobx_1.observable)({
    repos: [],
    get wiki() {
        return this.repos.find((repo) => repo.isWiki && repo.name.startsWith(store_1.store.login));
    },
    isInCodeTour: false
});
//# sourceMappingURL=index.js.map