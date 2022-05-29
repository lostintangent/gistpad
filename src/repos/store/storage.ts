import { commands, ExtensionContext } from "vscode";
import { tracing } from "../../extension";

const HASREPOS_CONTEXT = "gistpad:hasRepos";
const REPO_KEY = "gistpad.repos";

export interface IStorage {
  repos: string[];
}

export let reposStorage: IStorage;
export async function initializeStorage(context: ExtensionContext) {
  reposStorage = {
    get repos(): string[] {
      tracing?.appendLine(
        `Getting repos from global state = ${context.globalState.get(
          REPO_KEY,
          []
        )}`,
        tracing?.messageType.Info
      );

      return context.globalState.get(REPO_KEY, []);
    },
    set repos(repos: string[]) {
      tracing?.appendLine(
        `Setting repos to ${repos}`,
        tracing?.messageType.Info
      );
      context.globalState.update(REPO_KEY, repos);
      commands.executeCommand("setContext", HASREPOS_CONTEXT, repos.length > 0);
    }
  };

  commands.executeCommand(
    "setContext",
    HASREPOS_CONTEXT,
    reposStorage.repos.length > 0
  );
}
