import * as vscode from 'vscode';

type logType = 'info' | 'warning' | 'error';

export class Log {
  private channel: vscode.OutputChannel | undefined;

  private log = (message: string, type: logType) => {
    if (!this.channel) {
      throw new Error('No extension output channel defined.');
    }

    const time = new Date();
    this.channel.appendLine(`[${type}][${time.toUTCString()}] ${message}`);
  }

  public info = (message: string) => {
    return this.log(message, 'info');
  }

  public warning = (message: string) => {
    return this.log(message, 'warning');
  }

  public error = (message: string) => {
    return this.log(message, 'error');
  }

  public setLoggingChannel = (channel: vscode.OutputChannel) => {
    if (this.channel) {
      throw new Error('Output channel already defined.');
    }

    this.channel = channel;

    this.info(`GistPad output channel initialized.`);
  }

}


export const log = new Log();
