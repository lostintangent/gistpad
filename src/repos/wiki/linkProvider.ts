import {
  CancellationToken,
  commands,
  DocumentLink,
  DocumentLinkProvider,
  languages,
  Range,
  TextDocument,
  Uri
} from "vscode";
import { EXTENSION_NAME } from "../../constants";
import { withProgress } from "../../utils";
import { RepoFileSystemProvider } from "../fileSystem";
import { Repository } from "../store";
import {
  findLinks,
  getPageFilePath,
  getTreeItemFromLink,
  getUriFromLink,
  LINK_SELECTOR
} from "./utils";

class WikiDocumentLink extends DocumentLink {
  constructor(
    public repo: Repository,
    public title: string,
    range: Range,
    target?: Uri
  ) {
    super(range, target);
  }
}

class WikiDocumentLinkProvider implements DocumentLinkProvider {
  public provideDocumentLinks(
    document: TextDocument
  ): WikiDocumentLink[] | undefined {
    const [repo] = RepoFileSystemProvider.getRepoInfo(document.uri)!;
    if (!repo.isWiki) {
      return;
    }

    const documentLinks = [...findLinks(document.getText())];
    return documentLinks.map(({ title, contentStart, contentEnd }) => {
      const linkRange = new Range(
        document.positionAt(contentStart),
        document.positionAt(contentEnd)
      );

      const treeItem = getTreeItemFromLink(repo, title);
      const linkUri = treeItem ? getUriFromLink(repo, title) : undefined;

      return new WikiDocumentLink(repo, title, linkRange, linkUri);
    });
  }

  async resolveDocumentLink(link: WikiDocumentLink, token: CancellationToken) {
    const filePath = getPageFilePath(link.title);
    link.target = RepoFileSystemProvider.getFileUri(link.repo.name, filePath);

    const treeItem = getTreeItemFromLink(link.repo, link.title);
    if (!treeItem) {
      await withProgress("Creating page...", async () =>
        commands.executeCommand(
          `${EXTENSION_NAME}._createWikiPage`,
          link.repo,
          link.title
        )
      );
    }

    return link;
  }
}

export function registerDocumentLinkProvider() {
  languages.registerDocumentLinkProvider(
    LINK_SELECTOR,
    new WikiDocumentLinkProvider()
  );
}
