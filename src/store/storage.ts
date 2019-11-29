import { ExtensionContext } from "vscode";

const FOLLOW_KEY = "gistpad.followedUsers";

export interface IStorage {
  followedUsers: string[];
}

export let storage: IStorage;
export function initializeStorage(context: ExtensionContext) {
  storage = {
    get followedUsers() {
      return context.globalState.get<string[]>(FOLLOW_KEY, []).sort();
    },
    set followedUsers(followedUsers: string[]) {
      context.globalState.update(FOLLOW_KEY, followedUsers);
    }
  };
}
