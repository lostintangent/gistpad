import { commands, ExtensionContext, window, workspace } from "vscode";
import { EXTENSION_NAME } from "../../constants";
import { stringToByteArray, withProgress } from "../../utils";
import { RepoFileSystemProvider } from "../fileSystem";
import { Repository, store } from "../store";
import { RepositoryFileNode, RepositoryNode } from "../tree/nodes";
import { openRepoDocument } from "../utils";
import { getPageFilePath } from "./utils";

import moment = require("moment");
const { titleCase } = require("title-case");

async function createWikiPage(
  name: string,
  repo: Repository,
  filePath: string
) {
  const title = titleCase(name);
  let fileHeading = `# ${title}

`;

  const uri = RepoFileSystemProvider.getFileUri(repo.name, filePath);
  return workspace.fs.writeFile(uri, stringToByteArray(fileHeading));
}

export function registerCommands(context: ExtensionContext) {
  // This is a private command that handles dynamically
  // creating wiki documents, when the user auto-completes
  // a new document link that doesn't exist.
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}._createWikiPage`,
      async (repo: Repository, name: string) => {
        const fileName = getPageFilePath(name);
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
      async (node?: RepositoryNode | RepositoryFileNode) => {
        const repo = node?.repo || store.wiki!;
        const repoName = repo.name;

        const input = window.createInputBox();
        input.title = `Add wiki page (${repoName})`;
        input.prompt = "Enter the name of the new page you'd like to create";

        input.onDidAccept(async () => {
          input.hide();

          if (input.value) {
            const path = getPageFilePath(input.value);
            const filePath =
              node instanceof RepositoryFileNode
                ? `${node.file.path}/${path}`
                : path;

            await withProgress("Adding new page...", async () =>
              createWikiPage(input.value, repo, filePath)
            );
            openRepoDocument(repoName, filePath);
          }
        });

        input.show();
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.openTodayPage`,
      async (node?: RepositoryNode, displayProgress: boolean = true) => {
        const sharedMoment = moment();
        const fileName = sharedMoment.format("YYYY-MM-DD");
        const filePath = getPageFilePath(fileName);

        const titleFormat = workspace
          .getConfiguration(EXTENSION_NAME)
          .get("wikis.daily.titleFormat", "LL");

        const repo = node?.repo || store.wiki!;
        const repoName = repo.name;

        const pageTitle = sharedMoment.format(titleFormat);

        const uri = RepoFileSystemProvider.getFileUri(repoName, filePath);

        const [, file] = RepoFileSystemProvider.getRepoInfo(uri)!;

        if (!file) {
          const writeFile = async () =>
            createWikiPage(pageTitle, repo, filePath);

          if (displayProgress) {
            await withProgress("Adding new page...", writeFile);
          } else {
            await writeFile();
          }
        }

        openRepoDocument(repoName, filePath);
      }
    )
  );
}
