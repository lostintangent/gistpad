import { strict as assert } from "node:assert";
import Module = require("node:module");
import { test } from "node:test";

const originalLoad = (Module as any)._load;

class EventEmitter<T> {
  event = () => ({ dispose() { } });

  fire(_event: T): void { }
}

const vscode = {
  Disposable: class {
    constructor(_callOnDispose: () => void) { }
  },
  EventEmitter,
  FileChangeType: {
    Changed: 0,
    Created: 1,
    Deleted: 2
  },
  FileSystemError: {
    Unavailable: (message: string) => new Error(message)
  },
  FileType: {
    File: 0
  },
  ProgressLocation: {
    Notification: 15
  },
  TabInputText: class { },
  window: {
    showInformationMessage: async () => undefined,
    tabGroups: {
      onDidChangeTabs: (_listener: unknown) => ({ dispose() { } })
    },
    withProgress: async (_options: unknown, action: () => Promise<unknown>) =>
      action()
  },
  workspace: {
    textDocuments: []
  }
};

/**
 * Loads the provider with a failed GitHub update and a minimal VS Code API.
 * The mock keeps this regression test focused on the file-system write contract.
 */
function loadProvider() {
  (Module as any)._load = function (request: string, parent: NodeModule) {
    if (request === "vscode") {
      return vscode;
    }

    if (parent?.filename.endsWith("fileSystem\\index.js")) {
      switch (request) {
        case "../config":
          return { get: () => true };
        case "../store/actions":
          return {
            forkGist: async () => undefined,
            getGist: async () => undefined,
            refreshGist: async () => undefined
          };
        case "../store/auth":
          return { ensureAuthenticated: async () => undefined };
        case "../utils":
          return {
            byteArrayToString: (content: Uint8Array) =>
              new TextDecoder().decode(content),
            encodeDirectoryUri: (uri: unknown) => uri,
            getGistDetailsFromUri: () => ({
              gistId: "gist-id",
              file: "note.md"
            }),
            isOwnedGist: () => true,
            stringToByteArray: (content: string) =>
              new TextEncoder().encode(content),
            uriToFileName: () => "note.md"
          };
        case "./api":
          return {
            getFileContents: async () => "",
            updateGistFiles: async () => {
              throw new Error("network unavailable");
            }
          };
        case "./git":
          return { addFile: async () => undefined };
      }
    }

    return originalLoad.apply(this, arguments as any);
  };

  return require("./index").GistFileSystemProvider;
}

/** Waits for the provider's debounced request without extending the test suite's runtime. */
function rejectAfter(delayMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("save never completed")), delayMs);
  });
}

test("rejects a save when the GitHub update fails", async () => {
  const GistFileSystemProvider = loadProvider();
  const provider = new GistFileSystemProvider({
    archivedGists: [],
    dailyNotes: {},
    gists: [
      {
        id: "gist-id",
        files: {
          "note.md": { filename: "note.md" }
        }
      }
    ],
    starredGists: [],
    unsyncedFiles: new Set<string>()
  });

  const save = provider.writeFile(
    {
      path: "/note.md",
      toString: () => "gist://gist-id/note.md"
    },
    new TextEncoder().encode("updated note"),
    { create: false, overwrite: true }
  );

  await assert.rejects(
    Promise.race([save, rejectAfter(500)]),
    /Unable to save Gist: network unavailable/
  );
});
