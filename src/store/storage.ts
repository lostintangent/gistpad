import { reaction } from "mobx";
import { commands, ExtensionContext, workspace } from "vscode";
import { GroupType, SortOrder, store } from ".";
import * as config from "../config";
import { EXTENSION_NAME } from "../constants";

const TUTORIAL_KEY = "gistpad.tutorials";
const FOLLOW_KEY = "gistpad.followedUsers";
const SORT_ORDER_KEY = "gistpad:sortOrder";
const GROUP_TYPE_KEY = "gistpad:groupType";

const SHOW_SCRATCH_NOTES_KEY = "scratchNotes.show";

export interface IStorage {
  followedUsers: string[];
  currentTutorialStep(gistId: string): number;
  setCurrentTutorialStep(gistId: string, tutorialStep: number): void;
}

function updateSortOrder(context: ExtensionContext, sortOrder: SortOrder) {
  context.globalState.update(SORT_ORDER_KEY, sortOrder);
  commands.executeCommand("setContext", SORT_ORDER_KEY, sortOrder);
}

function updateGroupType(context: ExtensionContext, groupType: GroupType) {
  context.globalState.update(GROUP_TYPE_KEY, groupType);
  commands.executeCommand("setContext", GROUP_TYPE_KEY, groupType);
}

type TutorialStatus = [string, number];

export let storage: IStorage;
export async function initializeStorage(context: ExtensionContext) {
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

  const groupType = context.globalState.get(GROUP_TYPE_KEY, GroupType.none);
  store.groupType = groupType;
  commands.executeCommand("setContext", GROUP_TYPE_KEY, groupType);

  reaction(
    () => [store.groupType],
    () => updateGroupType(context, store.groupType)
  );

  store.scratchNotes.show = await config.get(SHOW_SCRATCH_NOTES_KEY);

  workspace.onDidChangeConfiguration(async (e) => {
    if (e.affectsConfiguration(`${EXTENSION_NAME}.${SHOW_SCRATCH_NOTES_KEY}`)) {
      store.scratchNotes.show = await config.get(SHOW_SCRATCH_NOTES_KEY);
    }
  });
}
