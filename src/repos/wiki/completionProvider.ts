import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  languages,
  Position,
  Range,
  TextDocument
} from "vscode";
import { EXTENSION_NAME } from "../../constants";
import { RepoFileSystemProvider } from "../fileSystem";
import {
  getTreeItemFromLink,
  LINK_PREFIX,
  LINK_SELECTOR,
  LINK_SUFFIX
} from "./utils";

class WikiLinkCompletionProvider implements CompletionItemProvider {
  provideCompletionItems(
    document: TextDocument,
    position: Position
  ): CompletionItem[] | undefined {
    const [repo, file] = RepoFileSystemProvider.getRepoInfo(document.uri)!;
    if (!repo.isWiki) {
      return;
    }

    const lineText = document
      .lineAt(position)
      .text.substr(0, position.character);

    const linkOpening = lineText.lastIndexOf(LINK_PREFIX);
    if (linkOpening === -1) {
      return;
    }

    const link = lineText.substr(linkOpening + LINK_PREFIX.length);
    if (link === undefined || link.includes(LINK_SUFFIX)) {
      return;
    }

    const documents = repo.documents.filter((doc) => doc.path !== file?.path);
    const documentItems = documents.map((doc) => {
      const item = new CompletionItem(
        doc.displayName || doc.path,
        CompletionItemKind.File
      );

      // Automatically save the document upon selection
      // in order to update the backlinks in the tree.
      item.command = {
        command: "workbench.action.files.save",
        title: "Reference document"
      };

      return item;
    });

    if (!getTreeItemFromLink(repo, link)) {
      const newDocumentItem = new CompletionItem(link, CompletionItemKind.File);
      newDocumentItem.detail = `Create new page page "${link}"`;

      // Since we're dynamically updating the range as the user types,
      // we need to ensure the range spans the enter document name.
      newDocumentItem.range = new Range(
        position.translate({ characterDelta: -link.length }),
        position
      );

      // As soon as the user accepts this item,
      // automatically create the new document.
      newDocumentItem.command = {
        command: `${EXTENSION_NAME}._createWikiPage`,
        title: "Create new page",
        arguments: [repo, link]
      };

      documentItems.unshift(newDocumentItem);
    }

    return documentItems;
  }
}

let triggerCharacters = [...Array(94).keys()].map((i) =>
  String.fromCharCode(i + 32)
);

export async function registerLinkCompletionProvider() {
  languages.registerCompletionItemProvider(
    LINK_SELECTOR,
    new WikiLinkCompletionProvider(),
    ...triggerCharacters
  );
}
