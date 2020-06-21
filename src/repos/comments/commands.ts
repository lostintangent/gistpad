import {
  commands,
  CommentMode,
  CommentReply,
  ExtensionContext,
  MarkdownString
} from "vscode";
import { RepoCommitComment } from ".";
import { EXTENSION_NAME } from "../../constants";
import { getCurrentUser } from "../../store/auth";
import { RepoFileSystemProvider } from "../fileSystem";
import { store } from "../store";
import {
  createRepoComment,
  deleteRepoComment,
  editRepoComment
} from "./actions";

function updateComments(comment: RepoCommitComment, mode: CommentMode) {
  comment.parent.comments = comment.parent.comments.map((c) => {
    if ((c as RepoCommitComment).id === comment.id) {
      c.mode = mode;
    }

    return c;
  });
}

export function registerCommentCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.addRepositoryComment`,
      async ({ text, thread }: CommentReply) => {
        const [repo, path] = RepoFileSystemProvider.getFileInfo(thread.uri)!;
        const repository = store.repos.find((r) => r.name === repo);

        const comment = await createRepoComment(
          repo,
          path,
          text,
          thread.range.start.line + 1
        );

        repository?.comments.push(comment);

        const newComment = new RepoCommitComment(
          comment,
          repo,
          thread,
          getCurrentUser()
        );

        thread.comments = [newComment];
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.deleteRepositoryComment`,
      async (comment: RepoCommitComment) => {
        await deleteRepoComment(comment.repo, comment.id);
        comment.parent.dispose();
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.editRepositoryComment`,
      async (comment: RepoCommitComment) =>
        updateComments(comment, CommentMode.Editing)
    )
  );

  commands.registerCommand(
    `${EXTENSION_NAME}.saveRepositoryComment`,
    async (comment: RepoCommitComment) => {
      const content =
        comment.body instanceof MarkdownString
          ? comment.body.value
          : comment.body;

      await editRepoComment(comment.repo, comment.id, content);

      updateComments(comment, CommentMode.Preview);
    }
  );
}
