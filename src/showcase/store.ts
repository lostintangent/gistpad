import { observable } from "mobx";
import { Gist } from "../store";

export interface GistShowcaseCategory {
  title: string;
  gists: Gist[];
  isLoading: boolean;
}

export interface GistShowcase {
  categories: GistShowcaseCategory[];
  isLoading: boolean;
}

export interface Store {
  showcase: GistShowcase;
}

export const store: Store = observable({
  showcase: {
    categories: [],
    isLoading: false
  }
});
