
import * as vscode from 'vscode';
import { log } from "../logger";

export const createCommand = (command: Function) => {
  return function (...args: any[]) {
    try {
      command(...args);
    } catch (e) {
      log.error(e);

      vscode.window.showErrorMessage(e);

      throw e;
    }
  }
}