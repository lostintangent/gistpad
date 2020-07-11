import {
  Comment,
  CommentAuthorInformation,
  CommentController,
  CommentMode,
  comments,
  CommentThreadCollapsibleState,
  MarkdownString,
  Range,
  Uri,
  window,
  workspace
} from "vscode";
import { RepoFileSystemProvider } from "../fileSystem";
import { TreeItemBackLink } from "../store";

export class WikiBacklinksComments implements Comment {
  public body: string | MarkdownString;
  public mode: CommentMode = CommentMode.Preview;
  public author: CommentAuthorInformation;

  constructor(backlinks: TreeItemBackLink[]) {
    const content = backlinks
      .map((link) => {
        const [, file] = RepoFileSystemProvider.getRepoInfo(link.location.uri)!;
        const title = file!.displayName || file!.path;
        const args = [
          link.location.uri,
          {
            selection: {
              start: {
                line: link.location.range.start.line,
                character: link.location.range.start.character
              },
              end: {
                line: link.location.range.end.line,
                character: link.location.range.end.character
              }
            }
          }
        ];
        const command = `command:vscode.open?${encodeURIComponent(
          JSON.stringify(args)
        )}`;
        return `### [${title}](${command})
        
   \`\`\`markdown
   ${link.linePreview}
   \`\`\``;
      })
      .join("\r\n");

    const markdown = new MarkdownString(content);
    markdown.isTrusted = true;

    this.body = markdown;

    this.author = {
      name: "GistPad (Backlinks)",
      iconPath: Uri.parse(
        "https://cdn.jsdelivr.net/gh/vsls-contrib/gistpad/images/icon.png"
      )
    };
  }
}

let controller: CommentController | undefined;
export function registerCommentController() {
  window.onDidChangeActiveTextEditor((e) => {
    if (controller) {
      controller.dispose();
      controller = undefined;
    }

    if (!e || !RepoFileSystemProvider.isRepoDocument(e.document)) {
      return;
    }

    const info = RepoFileSystemProvider.getRepoInfo(e.document.uri)!;
    if (!info || !info[0].isWiki || !info[1]?.backLinks) {
      return;
    }

    controller = comments.createCommentController("gistpad.wiki", "Backlinks");
    const comment = new WikiBacklinksComments(info[1].backLinks);
    const thread = controller.createCommentThread(
      e.document.uri,
      new Range(e.document.lineCount, 0, e.document.lineCount, 0),
      [comment]
    );
    thread.collapsibleState = CommentThreadCollapsibleState.Expanded;

    workspace.onDidChangeTextDocument((change) => {
      if (change.document.uri.toString() === e.document.uri.toString()) {
        thread.range = new Range(
          e.document.lineCount,
          0,
          e.document.lineCount,
          0
        );
      }
    });
  });
}
