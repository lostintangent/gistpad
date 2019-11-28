import { observable } from "mobx"
import { Gist } from "./api";

export interface IStore {
    gists: Gist[];
    starredGists: Gist[];
    isLoading: boolean;
    isSignedIn: boolean;
}

export const store: IStore = observable({
    gists: [],
    starredGists: [],
    isLoading: false,
    isSignedIn: false
});