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

export interface GistShowcaseCategory {
  title: string;
  gists: Gist[];
  isLoading: boolean;
}

export interface GistShowcase {
  categories: GistShowcaseCategory[];
  isLoading: boolean;
}

export interface GistRevision {
  user: User;
  version: string;
  committed_at: string;
  change_status: GistRevisionStatus;
}

export const GistTypes: GistType[] = [
  "code-snippet",
  "doc",
  "playground",
  "playground-template",
  "notebook",
  "tutorial",
  "tour",
  "diagram",
  "flash-card"
];

export type GistType =
  | "code-snippet"
  | "doc"
  | "playground"
  | "playground-template"
  | "notebook"
  | "tutorial"
  | "tour"
  | "diagram"
  | "flash-card";

export type GistGroupType = GistType | "tag";

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
  type?: GistType;
  tags?: string[];
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

export enum GroupType {
  none = "none",
  tag = "tag",
  tagAndType = "tagAndType"
}

export interface ScratchNotes {
  gist: Gist | null;
  show: boolean;
}

export interface Store {
  scratchNotes: ScratchNotes;
  activeGist: Gist | null;
  followedUsers: FollowedUser[];
  gists: Gist[];
  isLoading: boolean;
  isSignedIn: boolean;
  login: string;
  token?: string;
  sortOrder: SortOrder;
  groupType: GroupType;
  starredGists: Gist[];
  showcase: GistShowcase;
  canCreateRepos: boolean;
  canDeleteRepos: boolean;
}

export const store: Store = observable({
  scratchNotes: {
    gist: null,
    show: false
  },
  activeGist: null,
  followedUsers: [],
  gists: [],
  isLoading: false,
  isSignedIn: false,
  login: "",
  sortOrder: SortOrder.updatedTime,
  groupType: GroupType.none,
  starredGists: [],
  showcase: {
    categories: [],
    isLoading: false
  },
  canCreateRepos: false,
  canDeleteRepos: false
});
