import { comparer, set } from "mobx";
import * as vscode from "vscode";
import { Repository, store, Tree, TreeItem } from ".";
import { getApi } from "../../store/actions";
import { RepoFileSystemProvider } from "../fileSystem";
import { storage } from "../store/storage";

export async function addRepoFile(
  repoName: string,
  branch: string,
  path: string,
  content = ""
) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const response = await api.put(`/repos/${repoName}/contents/${path}`, {
    message: `Create ${path}`,
    content,
    branch
  });

  const repository = store.repos.find((repo) => repo.name === repoName);
  repository?.tree?.tree.push(response.body.content);

  await updateRepository(repoName, branch);
}

export async function createBranch(repo: string, branch: string, sha: string) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  return api.post(`/repos/${repo}/git/refs`, {
    ref: `refs/heads/${branch}`,
    sha
  });
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

export async function createRepository(
  repoName: string,
  isPrivate: boolean = false
) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const name = repoName.replace(/\s/g, "-").replace(/[^\w\d-_]/g, "");

  const response = await api.post("/user/repos", {
    name,
    private: isPrivate
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

  const response = await api.post(`/repos/${repo}/git/trees`, {
    base_tree: baseTree,
    tree: changes
  });

  return response.body;
}

export async function deleteBranch(repo: string, branch: string) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  return api.delete(`/repos/${repo}/git/refs/heads/${branch}`);
}

export async function deleteRepository(repo: string) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  return api.delete(`/repos/${repo}`);
}

export async function deleteRepoFile(repo: Repository, file: TreeItem) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  await api.delete(`/repos/${repo.name}/contents/${file.path}`, {
    message: `Delete ${file.path}`,
    sha: file.sha,
    branch: repo.branch
  });

  repo.tree!.tree = repo.tree!.tree.filter(
    (treeItem) => treeItem.path !== file.path
  );

  await updateRepository(repo.name, repo.branch);
}

export async function getBranches(repo: string) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const response = await api.get(`/repos/${repo}/branches`);
  return response.body;
}

export async function getLatestCommit(repo: string, branch: string) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const response = await api.get(`/repos/${repo}/git/refs/heads/${branch}`);
  return response.body.object.sha;
}

export async function getRepoFile(repo: string, branch: string, sha: string) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const response = await api.get(`/repos/${repo}/git/blobs/${sha}`, {
    ref: branch
  });

  return Buffer.from(response.body.content, "base64").toString();
}

export async function getRepo(
  repo: string,
  branch: string,
  etag?: string
): Promise<[] | [Tree, string] | undefined> {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const options = etag ? { headers: { "If-None-Match": etag } } : {};
  try {
    const response = await api.get(
      `/repos/${repo}/git/trees/${branch}?recursive=1`,
      options
    );

    if (response.statusCode === 200) {
      return [response.body, response.headers.etag];
    } else {
      return [];
    }
  } catch (e) {
    // If the repo is empty (i.e. it has no files yet), then
    // the call to get the tree will return a 409.
    // TODO: Indicate when the repository has been
    // deleted on the server, or the user has lost
    // access permissions, so we can unmanage it.
  }
}

export async function listRepos() {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const response = await api.get("/user/repos", {
    affiliation: "owner,collaborator"
  });

  return response.body;
}

export async function rebaseBranch(
  repo: string,
  branch: string,
  message: string = `Merging ${branch}`
) {
  // 1) Create a new temp branch that's based on the latest commit on the default branch
  const commitSha = await getLatestCommit(repo, Repository.DEFAULT_BRANCH);
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
    await updateBranch(repo, Repository.DEFAULT_BRANCH, commit.sha);
    await deleteBranch(repo, branch);
  } catch {
    vscode.window.showErrorMessage(
      "Cannot merge branch due to conflicts with the latest changes in the repository."
    );
  } finally {
    await deleteBranch(repo, tempBranch);
  }
}

export async function renameFile(
  repo: Repository,
  file: TreeItem,
  newPath: string
) {
  const commitSha = await getLatestCommit(repo.name, repo.branch);
  const newTree = await createTree(repo.name, repo.tree!.sha, [
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
    repo.name,
    `Renaming ${file.path} to ${newPath}`,
    newTree.sha,
    commitSha
  );

  await updateBranch(repo.name, repo.branch, commit.sha);

  return updateRepository(repo.name, repo.branch);
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
  const repository = new Repository(repoName);

  const repos = storage.repos;
  if (repos.find((repo) => repo === repository.name)) {
    vscode.window.showInformationMessage("You're already managing this repo");
    return;
  } else {
    repos.push(repoName);
    storage.repos = repos;
  }

  store.repos.push(repository);

  const repo = await getRepo(repository.name, repository.branch);
  repository.isLoading = false;

  // The repo is undefined when it's empty, and therefore,
  // there's no tree or latest commit to set on it yet.
  if (repo) {
    const [tree, etag] = repo;
    repository.tree = tree;
    repository.etag = etag;

    repository.latestCommit = await getLatestCommit(
      repository.name,
      repository.branch
    );
  }

  return repository;
}

export async function mergeBranch(
  repo: string,
  branch: string,
  baseBranch = Repository.DEFAULT_BRANCH
) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const response = await api.post(`/repos/${repo}/merges`, {
    base: baseBranch,
    head: branch,
    commit_message: `Merging ${branch}`
  });

  return response.body;
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
    await updateRepository(repo.name, repo.branch, isRefreshing);
  }

  if (
    vscode.window.activeTextEditor &&
    !vscode.window.activeTextEditor.document.isDirty &&
    RepoFileSystemProvider.isRepoDocument(
      vscode.window.activeTextEditor.document
    )
  ) {
    setTimeout(() => {
      try {
        vscode.commands.executeCommand("workbench.action.files.revert");
      } catch {
        // If the file revert fails, it means that the open file was
        // deleted from the server. So let's simply close it.
        vscode.commands.executeCommand("workbench.action.closeActiveEditor");
      }
    }, 50);
  }
}

export async function updateRepository(
  repoName: string,
  branch: string,
  isRefreshing: boolean = false
) {
  const repo = store.repos.find((repo) => repo.name === repoName)!;
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
  if (repo.tree) {
    // Don't bother updating the tree if
    // it hasn't actually changed.
    if (!comparer.structural(repo.tree, tree)) {
      set(repo.tree, tree);
    }
  } else {
    repo.tree = tree;
  }

  repo.etag = etag;
  repo.isLoading = false;

  repo.latestCommit = await getLatestCommit(repoName, branch);
}

export async function unmanageRepo(repoName: string, branch: string) {
  storage.repos = storage.repos.filter(
    (repo) => repo !== repoName && repo !== `${repoName}#${branch}`
  );
  store.repos = store.repos.filter((repo) => repo.name !== repoName);

  vscode.window.visibleTextEditors.forEach((editor) => {
    if (RepoFileSystemProvider.isRepoDocument(editor.document, repoName)) {
      editor.hide();
    }
  });
}

async function updateRepoFileInternal(
  api: any,
  repo: string,
  branch: string,
  path: string,
  contents: string,
  sha: string
) {
  const response = await api.put(`/repos/${repo}/contents/${path}`, {
    message: `Update ${path}`,
    content: contents,
    sha,
    branch
  });

  const repository = store.repos.find((r) => r.name === repo);
  const file = repository!.tree!.tree.find((file) => file.path === path);
  file!.sha = response.body.content.sha;
  file!.size = response.body.size;

  updateRepository(repo, branch);
}

export async function updateRepoFile(
  repo: string,
  branch: string,
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
      branch,
      path,
      // @ts-ignore
      contents.toString("base64"),
      sha
    );
  } catch (e) {
    const diffMatchPatch = require("diff-match-patch");
    const dmp = new diffMatchPatch();

    const originalFile = await getRepoFile(repo, branch, sha);
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
        branch,
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

export async function displayReadme(repository: Repository) {
  if (repository.hasReadme) {
    const uri = RepoFileSystemProvider.getFileUri(repository.name, "README.md");
    vscode.commands.executeCommand("markdown.showPreview", uri);
  }
}
