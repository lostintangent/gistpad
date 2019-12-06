
import * as vscode from 'vscode';
import { log } from "../logger";

export const createCommand = (command: Function) => {
  return async function (...args: any[]) {
    try {
      await command(...args);
    } catch (e) {
      log.error(e);

      await vscode.window.showErrorMessage(e);
    }
  }
}