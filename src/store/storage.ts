import { reaction } from "mobx";
import { commands, ExtensionContext } from "vscode";
import { SortOrder, store } from ".";

const TUTORIAL_KEY = "gistpad.tutorials";
const FOLLOW_KEY = "gistpad.followedUsers";
const SORT_ORDER_KEY = "gistpad:sortOrder";

export interface IStorage {
  followedUsers: string[];
  currentTutorialStep(gistId: string): number;
  setCurrentTutorialStep(gistId: string, tutorialStep: number): void;
}

function updateSortOrder(context: ExtensionContext, sortOrder: SortOrder) {
  context.globalState.update(SORT_ORDER_KEY, sortOrder);
  commands.executeCommand("setContext", SORT_ORDER_KEY, sortOrder);
}

type TutorialStatus = [string, number];

export let storage: IStorage;
export function initializeStorage(context: ExtensionContext) {
  storage = {
    get followedUsers() {
      return context.globalState.get<string[]>(FOLLOW_KEY, []).sort();
    },
    set followedUsers(followedUsers: string[]) {
      context.globalState.update(FOLLOW_KEY, followedUsers);
    },
    currentTutorialStep(gistId: string): number {
      const tutorials = context.globalState.get<TutorialStatus[]>(
        TUTORIAL_KEY,
        []
      );

      const tutorial = tutorials.find(([id, _]) => id === gistId);
      return tutorial ? tutorial[1] : 1;
    },
    setCurrentTutorialStep(gistId: string, tutorialStep: number) {
      const tutorials = context.globalState.get<TutorialStatus[]>(
        TUTORIAL_KEY,
        []
      );

      const tutorial = tutorials.find(([id, _]) => id === gistId);

      if (tutorial) {
        tutorial[1] = tutorialStep;
      } else {
        tutorials.push([gistId, tutorialStep]);
      }

      context.globalState.update(TUTORIAL_KEY, tutorials);
    }
  };

  const sortOrder = context.globalState.get(
    SORT_ORDER_KEY,
    SortOrder.updatedTime
  );

  store.sortOrder = sortOrder;
  commands.executeCommand("setContext", SORT_ORDER_KEY, sortOrder);

  reaction(
    () => [store.sortOrder],
    () => updateSortOrder(context, store.sortOrder)
  );
}
