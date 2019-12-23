import { observable } from "mobx";

interface Owner {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
}

export interface GistFile {
  content?: string;
  filename?: string;
  size?: number;
  truncated?: boolean;
  raw_url?: string;
  type?: string;
}

export interface GistRevisionStatus {
  total: number;
  additions: number;
  deletions: number;
}

export interface GistRevision {
  user: Owner;
  version: string;
  committed_at: string;
  change_status: GistRevisionStatus;
}

export interface Gist {
  id: string;
  files: { [fileName: string]: GistFile };
  html_url: string;
  truncated: boolean;
  url: string;
  description: string;
  owner: Owner;
  public: boolean;
  created_at: string;
  updated_at: string;
  history: GistRevision[];
  git_pull_url: string;
}

export interface GistComment {
  id: string;
  body: string;
  user: Owner;
  created_at: string;
  updated_at: string;
  author_association: "NONE" | "OWNER";
}

export interface IFollowedUser {
  username: string;
  gists: Gist[];
  isLoading: boolean;
}

export interface IStore {
  gists: Gist[];
  starredGists: Gist[];
  followedUsers: IFollowedUser[];
  isLoading: boolean;
  isSignedIn: boolean;
  login: string;
  sortOrder: SortOrder;
}

export enum SortOrder {
  alphabetical = "alphabetical",
  updatedTime = "updatedTime"
}

export const store: IStore = observable({
  gists: [],
  starredGists: [],
  followedUsers: [],
  isLoading: false,
  isSignedIn: false,
  login: "",
  sortOrder: SortOrder.updatedTime
});
