import { commands, ExtensionContext } from "vscode";

const HASREPOS_CONTEXT = "gistpad:hasRepos";
const REPO_KEY = "gistpad.repos";

export interface IStorage {
  repos: string[];
}

export let storage: IStorage;
export async function initializeStorage(context: ExtensionContext) {
  storage = {
    get repos(): string[] {
      return context.globalState.get(REPO_KEY, []);
    },
    set repos(repos: string[]) {
      context.globalState.update(REPO_KEY, repos);
      commands.executeCommand("setContext", HASREPOS_CONTEXT, repos.length > 0);
    }
  };

  commands.executeCommand(
    "setContext",
    HASREPOS_CONTEXT,
    storage.repos.length > 0
  );
}
