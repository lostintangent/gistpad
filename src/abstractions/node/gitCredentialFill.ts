import { execSync } from "child_process";

export function execGitCredentialFill() {
  // See here for more details: https://git-scm.com/docs/git-credential
  const input = `protocol=https
host=github.com

`;

  try {
    const response = execSync("git credential fill", {
      input,
      encoding: "utf8"
    });
    return response.split("password=")[1].trim();
  } catch (e) {
    return;
  }
}
