"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWiki = exports.getUriFromLink = exports.getTreeItemFromLink = exports.findLinks = exports.getPageFilePath = exports.LINK_SUFFIX = exports.LINK_PREFIX = exports.LINK_SELECTOR = void 0;
const fileSystem_1 = require("../fileSystem");
const utils_1 = require("../utils");
const config_1 = require("./config");
exports.LINK_SELECTOR = [
    {
        scheme: fileSystem_1.REPO_SCHEME,
        language: "markdown"
    }
];
exports.LINK_PREFIX = "[[";
exports.LINK_SUFFIX = "]]";
const LINK_PATTERN = /(?:#?\[\[)(?<page>[^\]]+)(?:\]\])|#(?<tag>[^\s]+)/gi;
const WIKI_REPO_PATTERNS = ["wiki", "notes", "obsidian", "journal"];
const WIKI_WORKSPACE_FILES = [
    "gistpad.json",
    ".vscode/gistpad.json",
    ".vscode/foam.json"
];
const DAILY_PATTERN = /\d{4}-\d{2}-\d{2}/;
function getPageFilePath(name) {
    let fileName = (0, utils_1.sanitizeName)(name).toLocaleLowerCase();
    if (!fileName.endsWith(".md")) {
        fileName += ".md";
    }
    if (DAILY_PATTERN.test(fileName)) {
        const pathPrefix = config_1.config.dailyDirectName
            ? `${config_1.config.dailyDirectName}/`
            : "";
        return `${pathPrefix}${fileName}`;
    }
    else {
        return fileName;
    }
}
exports.getPageFilePath = getPageFilePath;
function* findLinks(contents) {
    let match;
    while ((match = LINK_PATTERN.exec(contents))) {
        const title = match.groups.page || match.groups.tag;
        const start = match.index;
        const end = start + match[0].length;
        const contentStart = start + match[0].indexOf(title);
        const contentEnd = contentStart + title.length;
        yield {
            title,
            start,
            end,
            contentStart,
            contentEnd
        };
    }
}
exports.findLinks = findLinks;
function getTreeItemFromLink(repo, link) {
    return repo.tree.tree.find((item) => {
        var _a;
        return ((_a = item.displayName) === null || _a === void 0 ? void 0 : _a.toLocaleLowerCase()) === link.toLocaleLowerCase() ||
            item.path === link ||
            item.path.replace(".md", "") === link;
    });
}
exports.getTreeItemFromLink = getTreeItemFromLink;
function getUriFromLink(repo, link) {
    const treeItem = getTreeItemFromLink(repo, link);
    return fileSystem_1.RepoFileSystemProvider.getFileUri(repo.name, treeItem === null || treeItem === void 0 ? void 0 : treeItem.path);
}
exports.getUriFromLink = getUriFromLink;
function isWiki(repo, tree) {
    const repoTree = tree || repo.tree;
    return (WIKI_REPO_PATTERNS.some((pattern) => repo.name.toLocaleLowerCase().includes(pattern)) ||
        !!(repoTree === null || repoTree === void 0 ? void 0 : repoTree.tree.some((item) => WIKI_WORKSPACE_FILES.includes(item.path))));
}
exports.isWiki = isWiki;
//# sourceMappingURL=utils.js.map