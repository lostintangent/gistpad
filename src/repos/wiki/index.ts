import { ExtensionContext } from "vscode";
import { registerCommands } from "./commands";
import { registerCommentController } from "./comments";
import { registerLinkCompletionProvider } from "./completionProvider";
import { registerLinkDecorator } from "./decorator";
import { registerHoverProvider } from "./hoverProvider";
import { registerDocumentLinkProvider } from "./linkProvider";

export function registerWikiController(context: ExtensionContext) {
  registerCommands(context);
  registerLinkDecorator();
  registerHoverProvider();

  registerLinkCompletionProvider();
  registerDocumentLinkProvider();

  registerCommentController();
}
