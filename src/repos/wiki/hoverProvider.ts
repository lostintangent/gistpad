import {
  Hover,
  HoverProvider,
  languages,
  MarkdownString,
  Position,
  Range,
  TextDocument
} from "vscode";
import { RepoFileSystemProvider } from "../fileSystem";
import {
  findLinks,
  getTreeItemFromLink,
  LINK_PREFIX,
  LINK_SELECTOR
} from "./utils";

class LinkHoverProvider implements HoverProvider {
  public provideHover(document: TextDocument, position: Position) {
    const [repo] = RepoFileSystemProvider.getRepoInfo(document.uri)!;
    if (!repo.isWiki) {
      return;
    }

    const line = document.lineAt(position).text;
    const links = [...findLinks(line)];
    if (!links) {
      return;
    }

    const link = links.find(([link, linkStart]) => {
      const linkEnd = linkStart + link.length + LINK_PREFIX.length * 2;
      const range = new Range(position.line, linkStart, position.line, linkEnd);
      return range.contains(position);
    });

    if (!link) {
      return;
    }

    const treeItem = getTreeItemFromLink(repo, link[0]);
    if (treeItem) {
      const contents = new MarkdownString(treeItem.contents);
      return new Hover(contents);
    }
  }
}

export function registerHoverProvider() {
  languages.registerHoverProvider(LINK_SELECTOR, new LinkHoverProvider());
}
