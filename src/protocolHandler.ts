import { URLSearchParams } from 'url';
import * as vscode from 'vscode';
import { CommandId } from './constants';
import { log } from './logger';

const getQuery = (uri: vscode.Uri): URLSearchParams => {
  const query = new URLSearchParams(uri.query);

  return query;
}

const openGistFactory = (paramName: 'id' | 'url') => {
  return async (uri: vscode.Uri) => {
    const query = getQuery(uri);

    const gistParam = query.get(paramName);

    if (!gistParam) {
      log.error(`No gist ${paramName} specified in "${uri}"`);
      throw new Error(`No gist ${paramName} specified.`);
    }

    const propName = (paramName === 'id')
      ? 'gistId'
      : 'gistUrl'

    await vscode.commands.executeCommand(CommandId.openGist, { [propName]: gistParam });
  }
}

export class GistPadProtocolHandler implements vscode.UriHandler {
  public async handleUri(uri: vscode.Uri): Promise<void> {
    switch (uri.path) {
      case '/open-gist': {
        const openGist = openGistFactory('id');

        return await openGist(uri);
      }

      case '/open-gist-url': {
        const openGistUrl = openGistFactory('url')

        return await openGistUrl(uri);
      }

      default: {
        break;
      }
    }
  }

  public dispose(): void { }
}

export const initializeProtocolHander = () => {
  if (typeof vscode.window.registerUriHandler === 'function') {
    log.info('Protocol handler is registered.');
    vscode.window.registerUriHandler(new GistPadProtocolHandler);
  }
}