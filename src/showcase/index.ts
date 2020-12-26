import axios from "axios";
import { reaction, runInAction } from "mobx";
import { commands, env, ExtensionContext, Uri } from "vscode";
import * as config from "../config";
import { EXTENSION_NAME } from "../constants";
import { store as authStore } from "../store";
import { getGists } from "../store/actions";
import { updateGistTags } from "../utils";
import { GistShowcaseCategory, store } from "./store";
import { registerTreeProvider } from "./tree";

export async function refreshShowcase() {
  store.showcase.isLoading = true;

  return runInAction(async () => {
    const showcaseUrl = await config.get("showcaseUrl");
    const showcase = await axios.get(showcaseUrl);
    store.showcase.categories = showcase.data.categories.map(
      (category: GistShowcaseCategory) => ({
        title: category.title,
        gists: [],
        _gists: category.gists,
        isLoading: true
      })
    );

    store.showcase.isLoading = false;
    return Promise.all(
      store.showcase.categories.map(async (category) => {
        // @ts-ignore
        category.gists = updateGistTags(await getGists(category._gists));
        category.isLoading = false;
      })
    );
  });
}

export function registerShowcaseModule(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.refreshShowcase`,
      refreshShowcase
    )
  );

  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.submitShowcaseEntry`, () => {
      env.openExternal(Uri.parse("https://aka.ms/gistpad-showcase-submission"));
    })
  );

  registerTreeProvider(context);

  reaction(
    () => authStore.isSignedIn,
    (isSignedIn) => {
      if (isSignedIn) {
        refreshShowcase();
      }
    }
  );
}
