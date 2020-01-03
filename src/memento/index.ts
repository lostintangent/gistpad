import * as vscode from "vscode";

let memento: vscode.Memento | null = null;

export const initializeMemento = (context: vscode.ExtensionContext) => {
  memento = context.globalState;
};

export const set = (key: string, value: string) => {
  if (!memento) {
    throw new Error(
      "The memento storage is not initialized. Please call `initializeMemento(extensionContext)` first."
    );
  }

  memento.update(key, value);
};

export const get = (key: string): string | undefined => {
  if (!memento) {
    throw new Error(
      "The memento storage is not initialized. Please call `initializeMemento(extensionContext)` first."
    );
  }

  const result = memento.get(key);

  return result as string | undefined;
};

export const remove = (key: string): void => {
  if (!memento) {
    throw new Error(
      "The memento storage is not initialized. Please call `initializeMemento(extensionContext)` first."
    );
  }

  memento.update(key, void 0);
};
