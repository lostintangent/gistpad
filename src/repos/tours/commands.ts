import { commands, ExtensionContext } from "vscode";
import { EXTENSION_NAME } from "../../constants";
import { recordTour, selectTour } from "../../tour";
import { RepoFileSystemProvider } from "../fileSystem";
import { store } from "../store";
import { RepositoryNode } from "../tree/nodes";
import { loadRepoTours } from "./actions";

export async function registerTourCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.recordRepoCodeTour`,
      async (node: RepositoryNode) => {
        store.isInCodeTour = true;

        const uri = RepoFileSystemProvider.getFileUri(node.repo.name);
        recordTour(uri);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.startRepoCodeTour`,
      async (node: RepositoryNode) => {
        const [tours, workspaceRoot] = await loadRepoTours(node.repo);
        if (await selectTour(tours, workspaceRoot)) {
          store.isInCodeTour = true;
        }
      }
    )
  );
}
