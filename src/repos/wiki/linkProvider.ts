import {
  DocumentLink,
  DocumentLinkProvider,
  languages,
  Range,
  TextDocument
} from "vscode";
import { RepoFileSystemProvider } from "../fileSystem";
import { findLinks, getUriFromLink, LINK_PREFIX, LINK_SELECTOR } from "./utils";

class WikiDocumentLinkProvider implements DocumentLinkProvider {
  public provideDocumentLinks(
    document: TextDocument
  ): DocumentLink[] | undefined {
    const [repo] = RepoFileSystemProvider.getRepoInfo(document.uri)!;
    if (!repo.isWiki) {
      return;
    }

    const documentLinks = [...findLinks(document.getText())];
    return documentLinks.map(([link, index = 0]) => {
      const offset = index + LINK_PREFIX.length;
      const linkRange = new Range(
        document.positionAt(offset),
        document.positionAt(offset + link.length)
      );

      const linkUri = getUriFromLink(repo, link);
      return new DocumentLink(linkRange, linkUri);
    });
  }
}

export function registerDocumentLinkProvider() {
  languages.registerDocumentLinkProvider(
    LINK_SELECTOR,
    new WikiDocumentLinkProvider()
  );
}
