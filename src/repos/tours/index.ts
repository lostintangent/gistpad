import { ExtensionContext } from "vscode";
import { onDidEndTour } from "../../tour";
import { RepoFileSystemProvider } from "../fileSystem";
import { store } from "../store";
import { registerTourCommands } from "./commands";

export async function registerTourController(context: ExtensionContext) {
  registerTourCommands(context);

  onDidEndTour((tour) => {
    if (tour.id.startsWith(`${RepoFileSystemProvider.SCHEME}:/`)) {
      store.isInCodeTour = false;
    }
  });
}
