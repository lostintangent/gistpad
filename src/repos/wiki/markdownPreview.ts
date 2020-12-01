import * as vscode from "vscode";
import { RepoFileSystemProvider } from "../fileSystem";
import { getTreeItemFromLink, getUriFromLink } from "./utils";

export function extendMarkdownIt(md: any) {
  return md
    .use(require("markdown-it-regex").default, {
      name: "gistpad-links",
      regex: /(?<!\!)(?:\[\[)([^\]]+?)(?:\]\])/,
      replace: (link: string) => {
        if (
          !RepoFileSystemProvider.isRepoDocument(
            vscode.window.activeTextEditor!.document
          )
        ) {
          return;
        }

        const [repo] = RepoFileSystemProvider.getRepoInfo(
          vscode.window.activeTextEditor!.document.uri
        )!;
        if (!repo.isWiki) {
          return;
        }

        const linkUri = getUriFromLink(repo, link);
        const args = encodeURIComponent(JSON.stringify([linkUri]));
        const href = `command:vscode.open?${args}`;

        return `[[<a href=${href} title=${link}>${link}</a>]]`;
      }
    })
    .use(require("markdown-it-regex").default, {
      name: "gistpad-embeds",
      regex: /(?:\!\[\[)([^\]]+?)(?:\]\])/,
      replace: (link: string) => {
        if (
          !RepoFileSystemProvider.isRepoDocument(
            vscode.window.activeTextEditor!.document
          )
        ) {
          return;
        }

        const [repo] = RepoFileSystemProvider.getRepoInfo(
          vscode.window.activeTextEditor!.document.uri
        )!;
        if (!repo.isWiki) {
          return;
        }

        const treeItem = getTreeItemFromLink(repo, link);
        if (treeItem) {
          const markdown = require("markdown-it")();
          const htmlContent = markdown.render(treeItem.contents);
          return `<div>
<hr />
${htmlContent}
<hr />
</div>`;
        }
      }
    });
}
