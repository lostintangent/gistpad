import { commands, ExtensionContext, window, workspace } from "vscode";
import { EXTENSION_NAME } from "../../constants";
import { stringToByteArray, withProgress } from "../../utils";
import { RepoFileSystemProvider } from "../fileSystem";
import { RepositoryFileNode, RepositoryNode } from "../tree/nodes";
import { openRepoDocument, sanitizeName } from "../utils";

import moment = require("moment");
const { titleCase } = require("title-case");

function createWikiPage(name: string, repo: string, filePath: string) {
  const fileHeading = `# ${titleCase(name)}

`;

  const uri = RepoFileSystemProvider.getFileUri(repo, filePath);
  return workspace.fs.writeFile(uri, stringToByteArray(fileHeading));
}

function getDailyDirectory() {
  return workspace.getConfiguration("gistpad").get("wikis.dailyDirectory");
}

const DAILY_PATTERN = /\d{4}-\d{2}-\d{2}/;
function getPageFile(name: string) {
  let fileName = sanitizeName(name).toLocaleLowerCase();
  if (!fileName.endsWith(".md")) {
    fileName += ".md";
  }

  if (DAILY_PATTERN.test(fileName)) {
    const dailyDirectory = getDailyDirectory();
    return `${dailyDirectory}/${fileName}`;
  } else {
    return fileName;
  }
}

export function registerCommands(context: ExtensionContext) {
  // This is a private command that handles dynamically
  // creating wiki documents, when the user auto-completes
  // a new document link that doesn't exist.
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}._createWikiPage`,
      async (repo: string, name: string) => {
        const fileName = getPageFile(name);
        await createWikiPage(name, repo, fileName);

        // Automatically save the current, in order to ensure
        // the newly created backlink is discovered.
        await window.activeTextEditor?.document.save();
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.addWikiPage`,
      async (node: RepositoryNode | RepositoryFileNode) => {
        const page = await window.showInputBox({
          prompt: "Enter the name of the new page you'd like to create"
        });

        if (page) {
          const path = getPageFile(page);
          const filePath =
            node instanceof RepositoryFileNode
              ? `${node.file.path}/${path}`
              : path;

          await withProgress("Adding new page...", async () => {
            return createWikiPage(page, node.repo.name, filePath);
          });

          openRepoDocument(node.repo.name, filePath);
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.openTodayPage`,
      async (node: RepositoryNode) => {
        const page = moment().format("YYYY-MM-DD");
        const filePath = getPageFile(page);

        const uri = RepoFileSystemProvider.getFileUri(node.repo.name, filePath);
        const [, file] = RepoFileSystemProvider.getRepoInfo(uri)!;

        if (!file) {
          await withProgress("Adding new page...", async () => {
            return createWikiPage(page, node.repo.name, filePath);
          });
        }

        openRepoDocument(node.repo.name, filePath);
      }
    )
  );
}
