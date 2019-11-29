import { observable } from "mobx";

interface Owner {
    login: string;
    id: number;
}

export interface GistFile {
    content?: string;
    filename?: string;
    size?: number;
    truncated?: boolean;
    raw_url?: string;
}

export interface Gist {
    id: string;
    files: { [fileName:string]: GistFile };
    html_url: string;
    truncated: boolean;
    url: string;
    description: string;
    owner: Owner;
    public: boolean;
    created_at: string;
    updated_at: string;
}

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