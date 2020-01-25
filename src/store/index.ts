import { observable } from "mobx";

interface User {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GistFile {
  filename?: string;
  content?: string;
  type?: string;
  size?: number;
  raw_url?: string;
  truncated?: boolean;
}

export interface GistRevisionStatus {
  total: number;
  additions: number;
  deletions: number;
}

export interface GistRevision {
  user: User;
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
  owner: User;
  public: boolean;
  created_at: string;
  updated_at: string;
  history: GistRevision[];
  git_pull_url: string;
}

export interface GistComment {
  id: string;
  body: string;
  user: User;
  created_at: string;
  updated_at: string;
  author_association: "NONE" | "OWNER";
}

export interface FollowedUser {
  username: string;
  gists: Gist[];
  avatarUrl?: string;
  isLoading: boolean;
}

export enum SortOrder {
  alphabetical = "alphabetical",
  updatedTime = "updatedTime"
}

export interface Store {
  activeGist: Gist | null;
  followedUsers: FollowedUser[];
  gists: Gist[];
  isLoading: boolean;
  isSignedIn: boolean;
  login: string;
  sortOrder: SortOrder;
  starredGists: Gist[];
}

export const store: Store = observable({
  activeGist: null,
  followedUsers: [],
  gists: [],
  isLoading: false,
  isSignedIn: false,
  login: "",
  sortOrder: SortOrder.updatedTime,
  starredGists: []
});
