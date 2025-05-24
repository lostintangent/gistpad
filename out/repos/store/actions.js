"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.displayReadme = exports.updateRepoFile = exports.closeRepo = exports.updateRepository = exports.updateRepositories = exports.refreshRepositories = exports.mergeBranch = exports.openRepo = exports.updateBranch = exports.renameTreeItem = exports.rebaseBranch = exports.listRepos = exports.getDefaultBranch = exports.getRepo = exports.getRepoFile = exports.getLatestCommit = exports.getBranches = exports.deleteTreeItem = exports.deleteRepository = exports.deleteBranch = exports.createTree = exports.createRepositoryFromTemplate = exports.createRepository = exports.createCommit = exports.createBranch = exports.addRepoFile = void 0;
const vscode = require("vscode");
const _1 = require(".");
const actions_1 = require("../../store/actions");
const utils_1 = require("../../utils");
const fileSystem_1 = require("../fileSystem");
const storage_1 = require("../store/storage");
const actions_2 = require("../tours/actions");
const tree_1 = require("../tree");
const utils_2 = require("../utils");
const actions_3 = require("../wiki/actions");
async function addRepoFile(repoName, branch, path, content = "") {
    var _a;
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    const response = await api.put(`/repos/${repoName}/contents/${path}`, {
        message: `Create ${path}`,
        content,
        branch
    });
    const repository = _1.store.repos.find((repo) => repo.name === repoName);
    (_a = repository === null || repository === void 0 ? void 0 : repository.tree) === null || _a === void 0 ? void 0 : _a.tree.push(response.body.content);
    await updateRepository(repoName, branch);
}
exports.addRepoFile = addRepoFile;
async function createBranch(repo, branch, sha) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    return api.post(`/repos/${repo}/git/refs`, {
        ref: `refs/heads/${branch}`,
        sha
    });
}
exports.createBranch = createBranch;
async function createCommit(repo, message, tree, parentCommit) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    const response = await api.post(`/repos/${repo}/git/commits`, {
        message,
        tree,
        parents: [parentCommit]
    });
    return response.body;
}
exports.createCommit = createCommit;
async function createRepository(repoName, isPrivate = false) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    const name = (0, utils_2.sanitizeName)(repoName);
    const response = await api.post("/user/repos", {
        name,
        private: isPrivate
    });
    return response.body;
}
exports.createRepository = createRepository;
async function createRepositoryFromTemplate(template, repoName, isPrivate = false) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    const name = (0, utils_2.sanitizeName)(repoName);
    const response = await api.post(`/repos/${template}/generate`, {
        name,
        private: isPrivate
    });
    return response.body;
}
exports.createRepositoryFromTemplate = createRepositoryFromTemplate;
async function createTree(repo, baseTree, tree) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    const response = await api.post(`/repos/${repo}/git/trees`, {
        base_tree: baseTree,
        tree
    });
    return response.body;
}
exports.createTree = createTree;
async function deleteBranch(repo, branch) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    return api.delete(`/repos/${repo}/git/refs/heads/${branch}`);
}
exports.deleteBranch = deleteBranch;
async function deleteRepository(repo) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    return api.delete(`/repos/${repo}`);
}
exports.deleteRepository = deleteRepository;
async function deleteTreeItem(repo, treeItem) {
    return updateTreeItem(repo, treeItem, `Deleting ${treeItem.path}`, ({ path, mode, type }) => [
        {
            path,
            sha: null,
            mode,
            type
        }
    ]);
}
exports.deleteTreeItem = deleteTreeItem;
async function getBranches(repo) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    const response = await api.get(`/repos/${repo}/branches`);
    return response.body;
}
exports.getBranches = getBranches;
async function getLatestCommit(repo, branch) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    const response = await api.get(`/repos/${repo}/git/refs/heads/${branch}`);
    return response.body.object.sha;
}
exports.getLatestCommit = getLatestCommit;
async function getRepoFile(repo, sha) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    const response = await api.get(`/repos/${repo}/git/blobs/${sha}`);
    return new Uint8Array(Buffer.from(response.body.content, "base64")
        .toString("latin1")
        .split("")
        .map(charCodeAt));
}
exports.getRepoFile = getRepoFile;
function charCodeAt(c) {
    return c.charCodeAt(0);
}
async function getRepo(repo, branch, etag) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    const options = etag ? { headers: { "If-None-Match": etag } } : {};
    try {
        const response = await api.get(`/repos/${repo}/git/trees/${branch}?recursive=1`, options);
        if (response.statusCode === 200) {
            let eTagIndex = response.rawHeaders.indexOf("ETag") + 1;
            return [response.body, response.rawHeaders[eTagIndex]];
        }
        else {
            return [];
        }
    }
    catch (e) {
        console.log(e);
        // If the repo is empty (i.e. it has no files yet), then
        // the call to get the tree will return a 409.
        // TODO: Indicate when the repository has been
        // deleted on the server, or the user has lost
        // access permissions, so we can unmanage it.
    }
}
exports.getRepo = getRepo;
async function getDefaultBranch(repoName) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    let defaultBranch = "master";
    try {
        const response = await api.get(`/repos/${repoName}`);
        defaultBranch = response.body.default_branch;
    }
    catch (e) {
        console.log(`Gistpad: cannot get default branch for ${repoName}`);
    }
    return defaultBranch;
}
exports.getDefaultBranch = getDefaultBranch;
async function listRepos() {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    const response = await api.get("/user/repos", {
        affiliation: "owner,collaborator"
    });
    return response.body;
}
exports.listRepos = listRepos;
async function rebaseBranch(repo, branch, message = `Merging ${branch}`, defaultBranch) {
    // 1) Create a new temp branch that's based on the latest commit on the default branch
    const commitSha = await getLatestCommit(repo, defaultBranch);
    const tempBranch = `temp/${Date.now()}`;
    await createBranch(repo, tempBranch, commitSha);
    try {
        // 2) Merge the changes from the all of the commits on the source branch
        //    onto the temp branch, which will ensure that it includes any changes
        //    that have been made since the branch was started.
        const mergeCommit = await mergeBranch(repo, branch, tempBranch);
        // 3) Create a new commit on the default branch, whose tree
        //    refers to the merged commit on the temp branch. This ensure
        //    that the default branch gets all the changes from the source
        //    branch, but without any of the actual commit history.
        const mergedTree = mergeCommit.commit.tree.sha;
        const commit = await createCommit(repo, message, mergedTree, commitSha);
        // 4) Update the default branch to point at the newly committed
        //    changes, and then delete the source and temp branches.
        await updateBranch(repo, defaultBranch, commit.sha);
        await deleteBranch(repo, branch);
    }
    catch {
        vscode.window.showErrorMessage("Cannot merge branch due to conflicts with the latest changes in the repository.");
    }
    finally {
        await deleteBranch(repo, tempBranch);
    }
}
exports.rebaseBranch = rebaseBranch;
async function renameTreeItem(repo, treeItem, newPath) {
    return updateTreeItem(repo, treeItem, `Renaming ${treeItem.path} to ${newPath}`, ({ path, mode, sha, type }) => [
        {
            path,
            sha: null,
            mode,
            type
        },
        {
            path: path.replace(treeItem.path, newPath),
            mode,
            sha,
            type
        }
    ]);
}
exports.renameTreeItem = renameTreeItem;
async function updateTreeItem(repo, treeItem, commitMessage, updateFunction) {
    const files = treeItem.type === "blob"
        ? [treeItem]
        : repo.tree.tree.filter((item) => item.path.startsWith(treeItem.path) && item.type === "blob");
    const treeChanges = files.flatMap(updateFunction);
    const commitSha = await getLatestCommit(repo.name, repo.branch);
    const newTree = await createTree(repo.name, repo.tree.sha, treeChanges);
    const commit = await createCommit(repo.name, commitMessage, newTree.sha, commitSha);
    await updateBranch(repo.name, repo.branch, commit.sha);
    return updateRepository(repo.name, repo.branch);
}
async function updateBranch(repo, branch, sha) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    return await api.patch(`/repos/${repo}/git/refs/heads/${branch}`, {
        sha
    });
}
exports.updateBranch = updateBranch;
async function openRepo(repoName, showReadme = false) {
    // TODO: Add repo validation
    const defaultBranch = await getDefaultBranch(repoName);
    const repository = new _1.Repository(repoName, defaultBranch);
    const repos = storage_1.reposStorage.repos;
    if (repos.find((repo) => repo === repository.name)) {
        vscode.window.showInformationMessage("You've already opened this repository.");
        return;
    }
    else {
        repos.push(repoName);
        storage_1.reposStorage.repos = repos;
    }
    _1.store.repos.push(repository);
    const repo = await getRepo(repository.name, repository.branch);
    repository.isLoading = false;
    // The repo is undefined when it's empty, and therefore,
    // there's no tree or latest commit to set on it yet.
    if (repo) {
        const [tree, etag] = repo;
        await (0, actions_3.updateTree)(repository, tree);
        repository.etag = etag;
        repository.latestCommit = await getLatestCommit(repository.name, repository.branch);
        if (showReadme) {
            displayReadme(repository);
            // TODO: Replace this hack with something
            // better. We're currently doing this because
            // the repo node might not actually be present
            // in the tree, in order to focus it yet.
            setTimeout(() => {
                (0, tree_1.focusRepo)(repository);
            }, 1000);
            (0, actions_2.promptForTour)(repository);
        }
    }
    return repository;
}
exports.openRepo = openRepo;
async function mergeBranch(repo, branch, baseBranch) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    const response = await api.post(`/repos/${repo}/merges`, {
        base: baseBranch,
        head: branch,
        commit_message: `Merging ${branch}`
    });
    return response.body;
}
exports.mergeBranch = mergeBranch;
const REFRESH_INTERVAL = 1000 * 60 * 5;
let refreshTimer;
async function refreshRepositories() {
    if (storage_1.reposStorage.repos.length === 0) {
        return;
    }
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    _1.store.repos = await Promise.all(storage_1.reposStorage.repos.map(async (repo) => {
        const defaultBranch = await getDefaultBranch(repo);
        return new _1.Repository(repo, defaultBranch);
    }));
    await updateRepositories(true);
    setInterval(updateRepositories, REFRESH_INTERVAL);
}
exports.refreshRepositories = refreshRepositories;
async function updateRepositories(isRefreshing = false) {
    for (const repo of _1.store.repos) {
        await updateRepository(repo.name, repo.branch, isRefreshing);
    }
    if (vscode.window.activeTextEditor &&
        !vscode.window.activeTextEditor.document.isDirty &&
        fileSystem_1.RepoFileSystemProvider.isRepoDocument(vscode.window.activeTextEditor.document)) {
        setTimeout(() => {
            try {
                vscode.commands.executeCommand("workbench.action.files.revert");
            }
            catch {
                // If the file revert fails, it means that the open file was
                // deleted from the server. So let's simply close it.
                vscode.commands.executeCommand("workbench.action.closeActiveEditor");
            }
        }, 50);
    }
}
exports.updateRepositories = updateRepositories;
async function updateRepository(repoName, branch, isRefreshing = false) {
    const repo = _1.store.repos.find((repo) => repo.name === repoName);
    if (isRefreshing) {
        repo.isLoading = true;
    }
    const response = await getRepo(repo.name, repo.branch, repo.etag);
    if (!response || response.length === 0) {
        // If the repo became empty on the server,
        // then we need to delete the local tree.
        if (!response && repo.tree) {
            repo.tree = undefined;
        }
        repo.isLoading = false;
        return;
    }
    const [tree, etag] = response;
    await (0, actions_3.updateTree)(repo, tree);
    repo.etag = etag;
    repo.isLoading = false;
    repo.latestCommit = await getLatestCommit(repoName, branch);
}
exports.updateRepository = updateRepository;
async function closeRepo(repoName, branch) {
    storage_1.reposStorage.repos = storage_1.reposStorage.repos.filter((repo) => repo !== repoName && repo !== `${repoName}#${branch}`);
    _1.store.repos = _1.store.repos.filter((repo) => repo.name !== repoName);
    vscode.window.visibleTextEditors.forEach((editor) => {
        if (fileSystem_1.RepoFileSystemProvider.isRepoDocument(editor.document, repoName)) {
            editor.hide();
        }
    });
}
exports.closeRepo = closeRepo;
async function updateRepoFileInternal(api, repo, branch, path, contents, sha) {
    const response = await api.put(`/repos/${repo}/contents/${path}`, {
        message: `Update ${path}`,
        content: contents,
        sha,
        branch
    });
    const repository = _1.store.repos.find((r) => r.name === repo);
    const file = repository.tree.tree.find((file) => file.path === path);
    file.sha = response.body.content.sha;
    file.size = response.body.size;
    return updateRepository(repo, branch);
}
async function updateRepoFile(repo, branch, path, contents, sha) {
    const GitHub = require("github-base");
    const api = await (0, actions_1.getApi)(GitHub);
    try {
        await updateRepoFileInternal(api, repo, branch, path, Buffer.from(contents).toString("base64"), sha);
    }
    catch (e) {
        const diffMatchPatch = require("diff-match-patch");
        const dmp = new diffMatchPatch();
        const originalFile = (0, utils_1.byteArrayToString)(await getRepoFile(repo, sha));
        const diff = dmp.patch_make(originalFile, contents.toString());
        const currentFile = (await api.get(`/repos/${repo}/contents/${path}`)).body;
        const [merge, success] = dmp.patch_apply(diff, Buffer.from(currentFile.content, "base64").toString());
        if (success) {
            await updateRepoFileInternal(api, repo, branch, path, Buffer.from(merge).toString("base64"), currentFile.sha);
            setTimeout(() => vscode.commands.executeCommand("workbench.action.files.revert"), 50);
        }
        else {
            vscode.window.showInformationMessage("Can't save this file to do an unresolvable conflict with the remote repository.");
        }
    }
}
exports.updateRepoFile = updateRepoFile;
async function displayReadme(repository) {
    const readme = repository.readme;
    if (readme) {
        const uri = fileSystem_1.RepoFileSystemProvider.getFileUri(repository.name, readme);
        vscode.commands.executeCommand("markdown.showPreview", uri);
    }
}
exports.displayReadme = displayReadme;
//# sourceMappingURL=actions.js.map