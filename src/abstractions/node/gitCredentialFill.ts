import { execSync } from "child_process";
import * as path from "path";
import * as vscode from "vscode";

function getAskPassEnv() {
  const gitExt = vscode.extensions.getExtension("vscode.git");
  const gitExtPath = gitExt?.extensionPath;

  if (!gitExtPath) {
    return {};
  }

  return {
    GIT_ASKPASS: path.join(gitExtPath, "dist", "askpass-empty.sh")
  };
}

export function execGitCredentialFill() {
  // See here for more details: https://git-scm.com/docs/git-credential
  const input = `protocol=https
host=github.com

`;

  try {
    const response = execSync("git credential fill", {
      input,
      encoding: "utf8",
      env: {
        ...getAskPassEnv()
      }
    });

    return response.split("password=")[1].trim();
  } catch (e) {
    return;
  }
}
