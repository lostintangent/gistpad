import {
  commands,
  CommentMode,
  CommentReply,
  ExtensionContext,
  MarkdownString
} from "vscode";
import { GistCodeComment } from "../comments";
import { EXTENSION_NAME } from "../constants";
import {
  createGistComment,
  deleteGistComment,
  editGistComment
} from "../store/actions";
import { getCurrentUser } from "../store/auth";
import { getGistDetailsFromUri } from "../utils";

async function addComment(reply: CommentReply) {
  let thread = reply.thread;

  const { gistId } = getGistDetailsFromUri(thread.uri);
  const comment = await createGistComment(gistId, reply.text);

  let newComment = new GistCodeComment(
    comment,
    gistId,
    thread,
    getCurrentUser()
  );

  thread.comments = [...thread.comments, newComment];
}

export function registerCommentCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.addGistComment`, addComment)
  );

  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.replyGistComment`, addComment)
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.editGistComment`,
      async (comment: GistCodeComment) => {
        if (!comment.parent) {
          return;
        }

        comment.parent.comments = comment.parent.comments.map((cmt) => {
          if ((cmt as GistCodeComment).id === comment.id) {
            cmt.mode = CommentMode.Editing;
          }

          return cmt;
        });
      }
    )
  );

  commands.registerCommand(
    `${EXTENSION_NAME}.saveGistComment`,
    async (comment: GistCodeComment) => {
      if (!comment.parent) {
        return;
      }

      const content =
        comment.body instanceof MarkdownString
          ? comment.body.value
          : comment.body;

      await editGistComment(comment.gistId, comment.id, content);

      comment.parent.comments = comment.parent.comments.map((cmt) => {
        if ((cmt as GistCodeComment).id === comment.id) {
          cmt.mode = CommentMode.Preview;
        }

        return cmt;
      });
    }
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.deleteGistComment`,
      async (comment: GistCodeComment) => {
        let thread = comment.parent;
        if (!thread) {
          return;
        }

        await deleteGistComment(comment.gistId, comment.id);
        thread.comments = thread.comments.filter(
          (cmt) => (cmt as GistCodeComment).id !== comment.id
        );

        if (thread.comments.length === 0) {
          thread.dispose();
        }
      }
    )
  );
}
