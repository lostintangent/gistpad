import { comparer, set } from "mobx";
import * as vscode from "vscode";
import { Repository, RepositoryFile, store } from ".";
import { getApi } from "../../store/actions";
import { storage } from "../store/storage";

export async function addRepoFile(
  repoName: string,
  path: string,
  content = ""
) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const response = await api.put(`/repos/${repoName}/contents/${path}`, {
    message: `Create ${path}`,
    content
  });

  const repository = store.repos.find((repo) => repo.name === repoName);
  repository?.tree?.tree.push(response.body.content);

  refreshRepository(repoName);
}

export async function createCommit(
  repo: string,
  message: string,
  tree: string,
  parentCommit: string
) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const response = await api.post(`/repos/${repo}/git/commits`, {
    message,
    tree,
    parents: [parentCommit]
  });

  return response.body;
}

export async function createTree(
  repo: string,
  baseTree: string,
  changes: any[]
) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const response = await api.post(`/repos/${repo}/git/trees?recursive=1`, {
    base_tree: baseTree,
    tree: changes
  });

  return response.body;
}

export async function deleteRepoFile(file: RepositoryFile) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  await api.delete(`/repos/${file.repo.name}/contents/${file.path}`, {
    message: `Delete ${file.path}`,
    sha: file.sha
  });

  file.repo.tree!.tree = file.repo.tree!.tree.filter(
    (treeItem) => treeItem.sha !== file.treeItem.sha
  );

  refreshRepository(file.repo.name);
}

export async function getLatestCommit(repo: string) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const response = await api.get(`/repos/${repo}/git/refs/heads/master`);
  return response.body.object.sha;
}

export async function getRepoFile(repo: string, sha: string) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const response = await api.get(`/repos/${repo}/git/blobs/${sha}`);
  return Buffer.from(response.body.content, "base64").toString();
}

export async function getRepo(repo: string) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const response = await api.get(`/repos/${repo}/git/trees/HEAD?recursive=1`);
  return response.body;
}

export async function listRepos() {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const response = await api.get("/user/repos");
  return response.body;
}

export async function renameFile(file: RepositoryFile, newPath: string) {
  const commitSha = await getLatestCommit(file.repo.name);
  const newTree = await createTree(file.repo.name, file.repo.tree!.sha, [
    {
      path: file.path,
      sha: null,
      mode: file.mode,
      type: "blob"
    },
    {
      path: newPath,
      mode: file.mode,
      sha: file.sha,
      type: "blob"
    }
  ]);

  const commit = await createCommit(
    file.repo.name,
    `Renaming ${file.path} to ${newPath}`,
    newTree.sha,
    commitSha
  );

  set(file.repo.tree!, newTree);
  file.repo.latestCommit = commit.sha;

  return updateBranch(file.repo.name, "master", commit.sha);
}

export async function updateBranch(repo: string, branch: string, sha: string) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  return await api.patch(`/repos/${repo}/git/refs/heads/${branch}`, {
    sha
  });
}

export async function manageRepo(repoName: string) {
  // TODO: Add repo validation

  const repos = storage.repos;
  if (repos.find((repo) => repo === repoName)) {
    vscode.window.showInformationMessage("You're already managing this repo");
    return;
  } else {
    repos.push(repoName);
    storage.repos = repos;
  }

  const repository = new Repository(repoName);
  store.repos.push(repository);

  const tree = await getRepo(repoName);
  repository.setFiles(tree);
}

export async function refreshRepositories() {
  if (storage.repos.length === 0) {
    return;
  }

  store.repos = storage.repos.map((repo) => new Repository(repo));

  for (const repo of store.repos) {
    const tree = await getRepo(repo.name);
    repo.setFiles(tree);
    repo.latestCommit = await getLatestCommit(repo.name);
  }
}

export async function refreshRepository(repoName: string) {
  const repo = store.repos.find((repo) => repo.name === repoName)!;

  const tree = await getRepo(repo.name);

  if (!comparer.structural(repo.tree, tree)) {
    set(repo.tree!, tree);
  }

  repo.latestCommit = await getLatestCommit(repoName);
}

export async function unmanageRepo(repoName: string) {
  storage.repos = storage.repos.filter((repo) => repo !== repoName);
  store.repos = store.repos.filter((repo) => repo.name !== repoName);
}

async function updateRepoFileInternal(
  api: any,
  repo: string,
  path: string,
  contents: string,
  sha: string
) {
  const response = await api.put(`/repos/${repo}/contents/${path}`, {
    message: `Update ${path}`,
    content: contents,
    sha
  });
  const repository = store.repos.find((r) => r.name === repo);
  const file = repository!.tree!.tree.find((file) => file.path === path);
  file!.sha = response.body.content.sha;
  file!.size = response.body.size;

  refreshRepository(repo);
}

export async function updateRepoFile(
  repo: string,
  path: string,
  contents: Uint8Array,
  sha: string
) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  try {
    // @ts-ignore
    updateRepoFileInternal(api, repo, path, contents.toString("base64"), sha);
  } catch (e) {
    const diffMatchPatch = require("diff-match-patch");
    const dmp = new diffMatchPatch();

    const originalFile = await getRepoFile(repo, sha);
    const diff = dmp.patch_make(originalFile, contents.toString());

    const currentFile = (await api.get(`/repos/${repo}/contents/${path}`)).body;

    const [merge, success] = dmp.patch_apply(
      diff,
      Buffer.from(currentFile.content, "base64").toString("ascii")
    );
    if (success) {
      updateRepoFileInternal(
        api,
        repo,
        path,
        Buffer.from(merge).toString("base64"),
        currentFile.sha
      );

      // Force the active editor to refresh itself by
      // re-reading its contents from the file system.
      setTimeout(() => {
        vscode.commands.executeCommand("workbench.action.files.revert");
      }, 50);
    } else {
      vscode.window.showInformationMessage(
        "Can't save this file to do an unresoveable conflict with the remote repository."
      );
    }
  }
}
