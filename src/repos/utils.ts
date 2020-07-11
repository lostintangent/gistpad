import { commands } from "vscode";
import { RepoFileSystemProvider } from "./fileSystem";

export function openRepoDocument(repo: string, file: string) {
  const uri = RepoFileSystemProvider.getFileUri(repo, file);
  commands.executeCommand("vscode.open", uri);
}

export function sanitizeName(name: string) {
  return name.replace(/\s/g, "-").replace(/[^\w\d-_]/g, "");
}
