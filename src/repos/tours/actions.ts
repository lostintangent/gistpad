import * as vscode from "vscode";
import { promptForTour as prompt } from "../../tour";
import { RepoFileSystemProvider } from "../fileSystem";
import { Repository, store } from "../store";

export async function loadRepoTours(
  repository: Repository
): Promise<[any[], vscode.Uri]> {
  const workspaceRoot = RepoFileSystemProvider.getFileUri(repository.name);

  const tours = [];
  for (let tourPath of repository.tours) {
    const uri = RepoFileSystemProvider.getFileUri(repository.name, tourPath);
    const tourContents = await (
      await vscode.workspace.fs.readFile(uri)
    ).toString();
    const tour = JSON.parse(tourContents);
    tour.id = uri.toString();

    tours.push(tour);
  }

  return [tours, workspaceRoot];
}

export async function promptForTour(repository: Repository) {
  if (repository.hasTours) {
    const [tours, workspaceRoot] = await loadRepoTours(repository);
    const selectedTour = await prompt(workspaceRoot, tours);
    if (selectedTour) {
      store.isInCodeTour = true;
    }
  }
}
