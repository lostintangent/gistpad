import { set } from "mobx";
import * as vscode from "vscode";
import { Repository, RepositoryFile, store, Tree } from ".";
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

  updateRepository(repoName);
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

  updateRepository(file.repo.name);
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

export async function getRepo(
  repo: string,
  etag?: string
): Promise<[Tree, string] | undefined> {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const options = etag ? { headers: { "If-None-Match": etag } } : {};
  try {
    const response = await api.get(
      `/repos/${repo}/git/trees/HEAD?recursive=1`,
      options
    );

    if (response.statusCode === 200) {
      return [response.body, response.headers.etag];
    }
  } catch (e) {}
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

  const [tree, etag] = (await getRepo(repoName))!;
  repository.tree = tree;
  repository.etag = etag;
  repository.isLoading = false;
}

const REFRESH_INTERVAL = 1000 * 60 * 5;
let refreshTimer: NodeJS.Timer;
export async function refreshRepositories() {
  if (storage.repos.length === 0) {
    return;
  }

  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  store.repos = storage.repos.map((repo) => new Repository(repo));
  await updateRepositories(true);

  setInterval(updateRepositories, REFRESH_INTERVAL);
}

export async function updateRepositories(isRefreshing: boolean = false) {
  for (const repo of store.repos) {
    await updateRepository(repo.name, isRefreshing);
  }

  if (
    vscode.window.activeTextEditor &&
    vscode.window.activeTextEditor.document.uri.scheme === "repo" &&
    !vscode.window.activeTextEditor.document.isDirty
  ) {
    setTimeout(
      () => vscode.commands.executeCommand("workbench.action.files.revert"),
      50
    );
  }
}

export async function updateRepository(
  repoName: string,
  isRefreshing: boolean = false
) {
  const repo = store.repos.find((repo) => repo.name === repoName)!;
  if (isRefreshing) {
    repo.isLoading = true;
  }

  const response = await getRepo(repo.name, repo.etag);
  if (!response) {
    repo.isLoading = false;
    return;
  }

  const [tree, etag] = response;

  if (repo.tree) {
    set(repo.tree, tree);
  } else {
    repo.tree = tree;
  }

  repo.etag = etag;
  repo.isLoading = false;

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

  updateRepository(repo);
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
    await updateRepoFileInternal(
      api,
      repo,
      path,
      // @ts-ignore
      contents.toString("base64"),
      sha
    );
  } catch (e) {
    const diffMatchPatch = require("diff-match-patch");
    const dmp = new diffMatchPatch();

    const originalFile = await getRepoFile(repo, sha);
    const diff = dmp.patch_make(originalFile, contents.toString());

    const currentFile = (await api.get(`/repos/${repo}/contents/${path}`)).body;

    const [merge, success] = dmp.patch_apply(
      diff,
      Buffer.from(currentFile.content, "base64").toString()
    );

    if (success) {
      await updateRepoFileInternal(
        api,
        repo,
        path,
        Buffer.from(merge).toString("base64"),
        currentFile.sha
      );

      setTimeout(
        () => vscode.commands.executeCommand("workbench.action.files.revert"),
        50
      );
    } else {
      vscode.window.showInformationMessage(
        "Can't save this file to do an unresoveable conflict with the remote repository."
      );
    }
  }
}
