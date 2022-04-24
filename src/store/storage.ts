import { reaction } from "mobx";
import { commands, ExtensionContext, workspace } from "vscode";
import { GroupType, SortOrder, store } from ".";
import * as config from "../config";
import { EXTENSION_NAME } from "../constants";
import { output } from '../extension';

const FOLLOW_KEY = "gistpad.followedUsers";

// TODO: Replace these with user settings
const SORT_ORDER_KEY = "gistpad:sortOrder";
const GROUP_TYPE_KEY = "gistpad:groupType";

const SHOW_SCRATCH_NOTES_KEY = "scratchNotes.show";

export interface IStorage {
  followedUsers: string[];
}

function updateSortOrder(context: ExtensionContext, sortOrder: SortOrder) {
  context.globalState.update(SORT_ORDER_KEY, sortOrder);
  commands.executeCommand("setContext", SORT_ORDER_KEY, sortOrder);
}

function updateGroupType(context: ExtensionContext, groupType: GroupType) {
  context.globalState.update(GROUP_TYPE_KEY, groupType);
  commands.executeCommand("setContext", GROUP_TYPE_KEY, groupType);
}

export let storage: IStorage;
export async function initializeStorage(context: ExtensionContext) {
  storage = {
    get followedUsers() {
      let followedUsers = context.globalState.get(FOLLOW_KEY, []).sort();
      output?.appendLine(
        `Getting followed users from global state = ${followedUsers}`,
        output.messageType.Info
      );
      return followedUsers;
    },
    set followedUsers(followedUsers: string[]) {
      output?.appendLine(
        `Setting followed users to ${followedUsers}`,
        output.messageType.Info
      );
      context.globalState.update(FOLLOW_KEY, followedUsers);
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
