import * as vscode from "vscode";
import * as config from "./config";

export enum messageType {
  Info = "Info",
  Warning = "Warning",
  Error = "Error",
  Verbose = "Verbose",
  Debug = "Debug"
}

export class Output {
  private _outputChannel: any;
  public messageType = messageType;

  constructor() {
    this._outputChannel = vscode.window.createOutputChannel("GistPad");
  }

  private getDate(): string {
    const date = new Date();
    let timePart = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}`;
    let datePart = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`; // prettier-ignore
    return `${datePart} ${timePart}`;
  }

  public appendLine(message: string, messageType: messageType) {
    if (config.get("output")) {
      this._outputChannel.appendLine(
        `${this.getDate()} - ${messageType}: ${message}`
      );
    }
  }

  public hide() {
    this._outputChannel.hide();
  }

  public show() {
    this._outputChannel.show();
  }

  public dispose() { 
    this._outputChannel.dispose();
  }
}
