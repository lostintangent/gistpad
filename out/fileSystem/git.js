"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFile = addFile;
exports.renameFile = renameFile;
exports.exportToRepo = exportToRepo;
exports.duplicateGist = duplicateGist;
const fs = require("fs");
const os = require("os");
const path = require("path");
const git = require("simple-git/promise");
const store_1 = require("../store");
const actions_1 = require("../store/actions");
const auth_1 = require("../store/auth");
async function ensureRepo(gistId) {
    const repoPath = path.join(os.tmpdir(), gistId);
    const repoExists = fs.existsSync(repoPath);
    let repo;
    if (repoExists) {
        repo = git(repoPath);
        const isRepo = await repo.checkIsRepo();
        if (isRepo) {
            await repo.pull("origin", "master", { "--force": null });
        }
        else {
            await repo.init();
        }
    }
    else {
        const token = await (0, auth_1.getToken)();
        const remote = `https://${store_1.store.login}:${token}@gist.github.com/${gistId}.git`;
        await git(os.tmpdir()).silent(true).clone(remote);
        // Reset the git instance to point
        // at the newly cloned folder.
        repo = git(repoPath);
    }
    return [repoPath, repo];
}
async function addFile(gistId, fileName, content) {
    const [repoPath, repo] = await ensureRepo(gistId);
    const filePath = path.join(repoPath, fileName);
    fs.writeFileSync(filePath, content);
    await repo.add(filePath);
    await repo.commit(`Adding ${fileName}`);
    await repo.push("origin", "master");
    return (0, actions_1.refreshGist)(gistId);
}
async function renameFile(gistId, fileName, newFileName) {
    const [repoPath, repo] = await ensureRepo(gistId);
    const filePath = path.join(repoPath, fileName);
    const newFilePath = path.join(repoPath, newFileName);
    fs.renameSync(filePath, newFilePath);
    await repo.add([filePath, newFilePath]);
    await repo.commit(`Renaming ${fileName} to ${newFileName}`);
    await repo.push("origin", "master");
    return (0, actions_1.refreshGist)(gistId);
}
async function exportToRepo(gistId, repoName) {
    const [, repo] = await ensureRepo(gistId);
    const token = await (0, auth_1.getToken)();
    return pushRemote(repo, "export", `https://${store_1.store.login}:${token}@github.com/${store_1.store.login}/${repoName}.git`);
}
async function duplicateGist(targetGistId, sourceGistId) {
    const [, repo] = await ensureRepo(targetGistId);
    const token = await (0, auth_1.getToken)();
    return pushRemote(repo, "duplicate", `https://${store_1.store.login}:${token}@gist.github.com/${sourceGistId}.git`);
}
async function pushRemote(repo, remoteName, remoteUrl) {
    const remotes = await repo.getRemotes(false);
    if ((Array.isArray(remotes) &&
        !remotes.find((ref) => ref.name === remoteName)) ||
        // @ts-ignore
        !remotes[remoteName]) {
        await repo.addRemote(remoteName, remoteUrl);
    }
    await repo.push(remoteName, "master", { "--force": null });
    await repo.removeRemote(remoteName);
}
//# sourceMappingURL=git.js.map