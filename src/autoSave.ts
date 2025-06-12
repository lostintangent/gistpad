import * as vscode from "vscode";
import * as config from "./config";
import { FS_SCHEME } from "./constants";

interface AutoSaveTimer {
  timer: ReturnType<typeof setTimeout>;
  document: vscode.TextDocument;
}

export class AutoSaveManager {
  private timers = new Map<string, AutoSaveTimer>();
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        const document = event.document;
        if (this.shouldAutoSave(document)) {
          this.scheduleAutoSave(document);
        }
      })
    );

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (config.get("autoSave") === "onFocusChange") {
          // Save all dirty gist documents when focus changes
          vscode.workspace.textDocuments.forEach((document) => {
            if (this.shouldAutoSave(document) && document.isDirty) {
              this.saveDocument(document);
            }
          });
        }
      })
    );

    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("gistpad.autoSave") || 
            event.affectsConfiguration("gistpad.autoSaveDelay")) {
          // Clear all existing timers and reschedule if needed
          this.clearAllTimers();
          if (config.get("autoSave") === "afterDelay") {
            vscode.workspace.textDocuments.forEach((document) => {
              if (this.shouldAutoSave(document) && document.isDirty) {
                this.scheduleAutoSave(document);
              }
            });
          }
        }
      })
    );

    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((document) =>
        this.clearTimer(document.uri.toString())
      )
    );

    this.disposables.push(
      vscode.workspace.onDidCloseTextDocument((document) =>
        this.clearTimer(document.uri.toString())
      )
    );
  }

  private shouldAutoSave(document: vscode.TextDocument): boolean {
    if (document.uri.scheme !== FS_SCHEME) {
      return false;
    }

    const autoSaveMode = config.get("autoSave");
    if (autoSaveMode === "off") {
      return false;
    }

    if (!document.isDirty) {
      return false;
    }

    return true;
  }

  private scheduleAutoSave(document: vscode.TextDocument): void {
    const autoSaveMode = config.get("autoSave");
    
    if (autoSaveMode !== "afterDelay") {
      return;
    }

    const uri = document.uri.toString();
    
    this.clearTimer(uri);

    const delay = config.get("autoSaveDelay");
    const timer = setTimeout(() => {
      this.saveDocument(document);
      this.clearTimer(uri);
    }, delay);

    this.timers.set(uri, { timer, document });
  }

  private async saveDocument(document: vscode.TextDocument): Promise<void> {
    try {
      if (document.isDirty) {
        await document.save();
      }
    } catch (error) {
    }
  }

  private clearTimer(uri: string): void {
    const autoSaveTimer = this.timers.get(uri);
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer.timer);
      this.timers.delete(uri);
    }
  }

  private clearAllTimers(): void {
    this.timers.forEach((autoSaveTimer) => {
      clearTimeout(autoSaveTimer.timer);
    });
    this.timers.clear();
  }

  public dispose(): void {
    this.clearAllTimers();
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
  }
}

let autoSaveManager: AutoSaveManager | undefined;

export function registerAutoSaveManager(context: vscode.ExtensionContext): void {

  // Only initialize GistPad auto-save if VS Code's auto-save is disabled
  const vscodeAutoSave = vscode.workspace.getConfiguration("files").get("autoSave");
  if (vscodeAutoSave === "off") {
    autoSaveManager = new AutoSaveManager();
    context.subscriptions.push(autoSaveManager);
  }

  // Handle VS Code auto-save configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("files.autoSave")) {
        const vscodeAutoSave = vscode.workspace.getConfiguration("files").get("autoSave");
        
        if (vscodeAutoSave === "off" && !autoSaveManager) {
          // VS Code auto-save was disabled, initialize GistPad auto-save
          autoSaveManager = new AutoSaveManager();
          context.subscriptions.push(autoSaveManager);
        } else if (vscodeAutoSave !== "off" && autoSaveManager) {
          // VS Code auto-save was enabled, dispose GistPad auto-save
          autoSaveManager.dispose();
          autoSaveManager = undefined as any;
        }
      }
    })
  );
}