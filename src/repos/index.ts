import { when } from "mobx";
import { ExtensionContext } from "vscode";
import { store } from "../store";
import { isCodeTourInstalled } from "../tour";
import { registerRepoCommands } from "./commands";
import { registerCommentController } from "./comments";
import { registerRepoFileSystemProvider } from "./fileSystem";
import { refreshRepositories } from "./store/actions";
import { initializeStorage } from "./store/storage";
import { registerTourController } from "./tours";
import { registerTreeProvider } from "./tree";
import { registerWikiController } from "./wiki";

export async function registerRepoModule(context: ExtensionContext) {
  registerRepoCommands(context);

  registerRepoFileSystemProvider();
  registerTreeProvider();

  initializeStorage(context);

  registerCommentController(context);
  registerWikiController(context);

  if (await isCodeTourInstalled()) {
    registerTourController(context);
  }

  await when(() => store.isSignedIn);
  refreshRepositories();
}
