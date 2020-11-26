import {
  Comment,
  CommentAuthorInformation,
  CommentController,
  CommentMode,
  comments,
  CommentThread,
  CommentThreadCollapsibleState,
  ExtensionContext,
  MarkdownString,
  Range,
  Uri,
  window,
  workspace
} from "vscode";
import { EXTENSION_NAME } from "../../constants";
import { GistComment } from "../../store";
import { getCurrentUser } from "../../store/auth";
import { RepoFileSystemProvider } from "../fileSystem";
import { store } from "../store";
import { getRepoComments } from "./actions";
import { registerCommentCommands } from "./commands";

export class RepoCommitComment implements Comment {
  public contextValue: string;
  public body: string | MarkdownString;
  public id: string;
  public label: string;
  public mode: CommentMode = CommentMode.Preview;
  public author: CommentAuthorInformation;
  constructor(
    comment: GistComment,
    public repo: string,
    public parent: CommentThread,
    public currentUser: string
  ) {
    this.id = comment.id;
    this.body = comment.body;
    this.author = {
      name: comment.user.login,
      iconPath: Uri.parse(comment.user.avatar_url)
    };
    this.label = comment.author_association === "OWNER" ? "Owner" : "";
    this.contextValue = currentUser === comment.user.login ? "canEdit" : "";
  }
}

function commentRange({ line }: any) {
  return new Range(line - 1, 0, line - 1, 0);
}

let controller: CommentController | undefined;
async function checkForComments(uri: Uri) {
  const [repo, path] = RepoFileSystemProvider.getFileInfo(uri)!;
  const repoComments = await getRepoComments(repo);
  const fileComments = repoComments.filter(
    (comment: any) => comment.path === path
  );

  const currentUser = getCurrentUser();

  if (fileComments.length > 0) {
    fileComments.forEach((comment: any) => {
      const thread = controller!.createCommentThread(
        uri,
        commentRange(comment),
        []
      );

      // @ts-ignore
      thread.canReply = false;

      thread.comments = [
        new RepoCommitComment(comment, repo, thread, currentUser)
      ];

      thread.collapsibleState = CommentThreadCollapsibleState.Expanded;
    });
  }
}

export async function registerCommentController(context: ExtensionContext) {
  workspace.onDidOpenTextDocument(async (document) => {
    if (RepoFileSystemProvider.isRepoDocument(document)) {
      if (!controller) {
        controller = comments.createCommentController(
          `${EXTENSION_NAME}:repo`,
          "GistPad"
        );

        controller.commentingRangeProvider = {
          provideCommentingRanges: (document) => {
            if (
              // We don't want to register two comments providers at the same time
              !store.isInCodeTour &&
              RepoFileSystemProvider.isRepoDocument(document)
            ) {
              return [new Range(0, 0, document.lineCount, 0)];
            }
          }
        };
      }

      checkForComments(document.uri);
    }
  });

  workspace.onDidCloseTextDocument((e) => {
    if (
      RepoFileSystemProvider.isRepoDocument(e) &&
      !window.visibleTextEditors.find((editor) =>
        RepoFileSystemProvider.isRepoDocument(editor.document)
      )
    ) {
      controller!.dispose();
      controller = undefined;
    }
  });

  registerCommentCommands(context);
}
