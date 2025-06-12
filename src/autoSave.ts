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
    // Listen for text document changes to trigger auto-save
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        const document = event.document;
        if (this.shouldAutoSave(document)) {
          this.scheduleAutoSave(document);
        }
      })
    );

    // Listen for focus changes to trigger auto-save on focus change
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

    // Listen for configuration changes to adjust auto-save behavior
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

    // Listen for document saves to clear timers
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        this.clearTimer(document.uri.toString());
      })
    );

    // Listen for document closes to clear timers
    this.disposables.push(
      vscode.workspace.onDidCloseTextDocument((document) => {
        this.clearTimer(document.uri.toString());
      })
    );
  }

  private shouldAutoSave(document: vscode.TextDocument): boolean {
    // Only auto-save gist files
    if (document.uri.scheme !== FS_SCHEME) {
      return false;
    }

    // Check if auto-save is enabled
    const autoSaveMode = config.get("autoSave");
    if (autoSaveMode === "off") {
      return false;
    }

    // Don't auto-save if the document is not dirty
    if (!document.isDirty) {
      return false;
    }

    return true;
  }

  private scheduleAutoSave(document: vscode.TextDocument): void {
    const autoSaveMode = config.get("autoSave");
    
    // Only schedule for afterDelay mode
    if (autoSaveMode !== "afterDelay") {
      return;
    }

    const uri = document.uri.toString();
    
    // Clear existing timer for this document
    this.clearTimer(uri);

    // Schedule new auto-save
    const delay = config.get("autoSaveDelay");
    const timer = setTimeout(() => {
      this.saveDocument(document);
      this.clearTimer(uri);
    }, delay);

    this.timers.set(uri, { timer, document });
  }

  private async saveDocument(document: vscode.TextDocument): Promise<void> {
    try {
      // Only save if the document is still dirty
      if (document.isDirty) {
        await document.save();
      }
    } catch (error) {
      // Silently ignore save errors to avoid interrupting user workflow
      // The user will see errors if they try to save manually
      console.warn("Auto-save failed:", error);
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