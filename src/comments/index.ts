import {
  Comment,
  CommentAuthorInformation,
  CommentMode,
  comments,
  CommentThread,
  CommentThreadCollapsibleState,
  MarkdownString,
  Range,
  TextDocument,
  Uri,
  workspace
} from "vscode";
import * as config from "../config";
import { EXTENSION_ID } from "../constants";
import { GistComment } from "../store";
import { getGistComments } from "../store/actions";
import { getCurrentUser } from "../store/auth";
import { getGistDetailsFromUri, isGistDocument } from "../utils";

export class GistCodeComment implements Comment {
  public contextValue: string;
  public body: string | MarkdownString;
  public id: string;
  public label: string;
  public mode: CommentMode = CommentMode.Preview;
  public author: CommentAuthorInformation;

  constructor(
    comment: GistComment,
    public gistId: string,
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
    this.contextValue = comment.user.login === currentUser ? "canEdit" : "";
  }
}

function commentRange(document: TextDocument) {
  return new Range(document.lineCount, 0, document.lineCount, 0);
}

const documentComments = new Map<string, CommentThread>();
export async function registerCommentController() {
  const controller = comments.createCommentController(EXTENSION_ID, "Gist");
  controller.commentingRangeProvider = {
    provideCommentingRanges: (document) => {
      if (isGistDocument(document)) {
        return [commentRange(document)];
      }
    }
  };

  workspace.onDidOpenTextDocument(async (document) => {
    if (
      isGistDocument(document) &&
      !documentComments.has(document.uri.toString())
    ) {
      const { gistId } = getGistDetailsFromUri(document.uri);
      const comments = await getGistComments(gistId);

      const thread = controller.createCommentThread(
        document.uri,
        commentRange(document),
        []
      );

      const currentUser = getCurrentUser();

      thread.comments = comments.map(
        (comment) => new GistCodeComment(comment, gistId, thread, currentUser)
      );

      const alwaysShowComments = await config.get("alwaysShowComments");
      thread.collapsibleState = alwaysShowComments
        ? CommentThreadCollapsibleState.Expanded
        : CommentThreadCollapsibleState.Collapsed;

      workspace.onDidChangeTextDocument((e) => {
        if (e.document === document) {
          thread.range = commentRange(document);
        }
      });

      documentComments.set(document.uri.toString(), thread);
    }
  });
}
