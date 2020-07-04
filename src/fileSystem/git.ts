import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as git from "simple-git/promise";
import { store } from "../store";
import { refreshGist } from "../store/actions";
import { getToken } from "../store/auth";

async function ensureRepo(gistId: string): Promise<[string, git.SimpleGit]> {
  const repoPath = path.join(os.tmpdir(), gistId);
  const repoExists = fs.existsSync(repoPath);

  let repo;
  if (repoExists) {
    repo = git(repoPath);
    const isRepo = await repo.checkIsRepo();
    if (isRepo) {
      await repo.pull("origin", "master", { "--force": null });
    } else {
      await repo.init();
    }
  } else {
    const token = await getToken();
    const remote = `https://${store.login}:${token}@gist.github.com/${gistId}.git`;
    await git(os.tmpdir()).silent(true).clone(remote);

    // Reset the git instance to point
    // at the newly cloned folder.
    repo = git(repoPath);
  }

  return [repoPath, repo];
}

export async function addFile(
  gistId: string,
  fileName: string,
  content: Uint8Array
) {
  const [repoPath, repo] = await ensureRepo(gistId);
  const filePath = path.join(repoPath, fileName);

  fs.writeFileSync(filePath, content);

  await repo.add(filePath);
  await repo.commit(`Adding ${fileName}`);
  await repo.push("origin", "master");

  return refreshGist(gistId);
}

export async function renameFile(
  gistId: string,
  fileName: string,
  newFileName: string
) {
  const [repoPath, repo] = await ensureRepo(gistId);

  const filePath = path.join(repoPath, fileName);
  const newFilePath = path.join(repoPath, newFileName);
  fs.renameSync(filePath, newFilePath);

  await repo.add([filePath, newFilePath]);
  await repo.commit(`Renaming ${fileName} to ${newFileName}`);
  await repo.push("origin", "master");

  return refreshGist(gistId);
}

export async function exportToRepo(gistId: string, repoName: string) {
  const [, repo] = await ensureRepo(gistId);
  const token = await getToken();

  return pushRemote(
    repo,
    "export",
    `https://${store.login}:${token}@github.com/${store.login}/${repoName}.git`
  );
}

export async function duplicateGist(
  targetGistId: string,
  sourceGistId: string
) {
  const [, repo] = await ensureRepo(targetGistId);
  const token = await getToken();

  return pushRemote(
    repo,
    "duplicate",
    `https://${store.login}:${token}@gist.github.com/${sourceGistId}.git`
  );
}

async function pushRemote(
  repo: git.SimpleGit,
  remoteName: string,
  remoteUrl: string
) {
  const remotes = await repo.getRemotes(false);
  if (
    (Array.isArray(remotes) &&
      !remotes.find((ref) => ref.name === remoteName)) ||
    // @ts-ignore
    !remotes[remoteName]
  ) {
    await repo.addRemote(remoteName, remoteUrl);
  }

  await repo.push(remoteName, "master", { "--force": null });
  await repo.removeRemote(remoteName);
}
