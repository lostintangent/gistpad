import * as path from "path";
import { commands, Disposable, Event, EventEmitter, FileChangeEvent, FileStat, FileSystemError, FileSystemProvider, FileType, ProgressLocation, Uri, window, workspace } from "vscode";
import { EXTENSION_ID, FS_SCHEME, ZERO_WIDTH_SPACE } from "../constants";
import { getGistDiff, IGistDiff } from "../gistUpdates";
import { GistFile, IStore } from "../store";
import { forkGist, getApi, getGist, updateGist } from "../store/actions";
import { ensureAuthenticated } from "../store/auth";
import { getFileContents, getGistDetailsFromUri, openGistAsWorkspace, stringToByteArray, uriToFileName } from "../utils";
import { addFile, renameFile } from "./git";
const isBinaryPath = require("is-binary-path");

const getGistDiffVersion = async (uri: Uri, gistDiff: IGistDiff): Promise<string | undefined> => {
  const api = await getApi();
  const commitsResponse = await api.commits(uri.authority);
  const commits = commitsResponse.body;

  const commit = commits.find((c: any) => {
    const lastUpdateTime = new Date(gistDiff.lastSeenUpdateTime!);
    const commitedAtTime = new Date(c.committed_at);

    const delta = Math.abs(commitedAtTime.getTime() - lastUpdateTime.getTime());

    const result = delta <= (10 * 1000);

    return result;
  });

  if (!commit) {
    return;
  }

  const { version } = commit;

  return version;
}

const getDiffAuthority = (authority: string) => {
  const result = authority.split('diff__');
  const auth = result[1];

  if (!auth) {
    return authority;
  }

  return auth;
}

const isDiffAuthority = (authority: string) => {
  const result = authority.split('diff__');

  const auth = result[1];

  return !!auth;
}

export class GistFileSystemProvider implements FileSystemProvider {
  constructor(private store: IStore) { }

  public refresh = (data: FileChangeEvent[]) => {
    this.mtime = Date.now();
    this._onDidChangeFile.fire(data);
  }

  private async getFileFromUri(uri: Uri): Promise<GistFile> {
    const { gistId, file } = getGistDetailsFromUri(uri);

    if (isDiffAuthority(gistId)) {
      const id = getDiffAuthority(gistId);
      const gistDiff = getGistDiff(id);
      if (gistDiff) {
        const version = await getGistDiffVersion(uri.with({ authority: id }), gistDiff);
        const gist = await getGist(id, version);

        return gist.files[file];
      }
    }

    let gist = this.store.gists.find((gist) => gist.id === getDiffAuthority(gistId));
    // if a `version` specified, always fetch the gist
    if (!gist) {
      gist = await getGist(gistId);
    }

    return gist.files[file];
  }

  // TODO: Enable for binary files
  async copy?(
    source: Uri,
    destination: Uri,
    options: { overwrite: boolean }
  ): Promise<void> {
    await ensureAuthenticated();

    const { gistId } = getGistDetailsFromUri(source);
    const newFileName = uriToFileName(destination);

    const file = await this.getFileFromUri(source);
    await updateGist(gistId, newFileName, {
      filename: newFileName,
      content: file.content!
    });
  }

  createDirectory(uri: Uri): void {
    throw FileSystemError.NoPermissions(
      "Directories aren't supported by GitHub Gist."
    );
  }

  async delete(uri: Uri, options: { recursive: boolean }): Promise<void> {
    await ensureAuthenticated();

    const { gistId, file } = getGistDetailsFromUri(uri);
    await updateGist(gistId, file!, null);
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    const file = await this.getFileFromUri(uri);
    let contents = await getFileContents(file);

    if (
      !file.type!.startsWith("image") &&
      contents.trim() === ZERO_WIDTH_SPACE
    ) {
      contents = "";
    }

    return stringToByteArray(contents);
  }

  async readDirectory(uri: Uri): Promise<[string, FileType][]> {
    if (uri.path === "/") {
      const { gistId } = getGistDetailsFromUri(uri);
      if (gistId === "new") {
        const gist = await commands.executeCommand<any>(
          `${EXTENSION_ID}.newSecretGist`
        );
        openGistAsWorkspace(gist.id);
      } else if (gistId === "playground") {
        await commands.executeCommand(
          `${EXTENSION_ID}.newPlayground`,
          null,
          /*openAsWorkspace*/ true
        );
      }

      const gist = await getGist(gistId);

      // TODO: Check to see if the file list is truncated, and if
      // so, retrieve the full contents from the service.
      const files = Object.keys(gist.files).map((file) => [
        file,
        FileType.File
      ]);

      // @ts-ignore
      return files;
    } else {
      throw FileSystemError.FileNotFound;
    }
  }

  async rename(
    oldUri: Uri,
    newUri: Uri,
    options: { overwrite: boolean }
  ): Promise<void> {
    await ensureAuthenticated();

    const file = await this.getFileFromUri(oldUri);
    const { gistId } = getGistDetailsFromUri(oldUri);
    const newFileName = uriToFileName(newUri);

    if (isBinaryPath(file.filename!)) {
      await renameFile(gistId, file.filename!, newFileName);
    } else {
      await updateGist(gistId, file.filename!, {
        filename: newFileName
      });
    }
  }

  private mtime = Date.now();

  stat = async (uri: Uri): Promise<FileStat> => {
    if (uri.path === "/") {
      return {
        type: FileType.Directory,
        size: 0,
        ctime: 0,
        mtime: this.mtime
      };
    }

    const file = await this.getFileFromUri(uri);

    if (!file) {
      throw FileSystemError.FileNotFound(uri);
    }

    return {
      type: FileType.File,
      ctime: 0,
      mtime: this.mtime,
      size: file.size!
    };
  }

  async writeFile(
    uri: Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    await ensureAuthenticated();

    const { gistId } = getGistDetailsFromUri(uri);
    let file = await this.getFileFromUri(uri);

    if (isBinaryPath(uri.path)) {
      return addFile(gistId, path.basename(uri.path), content);
    } else {
      if (!file) {
        const newFileName = uriToFileName(uri);
        file = {
          filename: newFileName,
          truncated: false
        };
      }

      let newContent = new TextDecoder().decode(content);
      if (newContent.trim().length === 0) {
        // Gist doesn't allow files to be blank
        newContent = ZERO_WIDTH_SPACE;
      }

      file.content = newContent;
      file.size = newContent.length;

      try {
        await updateGist(gistId, file.filename!, {
          filename: file.filename,
          content: file.content
        });
      } catch (e) {
        // TODO: Check the Gist owner vs. current owner and fail
        // based on that, as opposed to requiring a hit to the server.
        const response = await window.showInformationMessage(
          "You can't edit a Gist you don't own.",
          "Fork this Gist"
        );
        if (response === "Fork this Gist") {
          await window.withProgress(
            {
              location: ProgressLocation.Notification,
              title: "Forking Gist..."
            },
            () => forkGist(gistId)
          );
        }
      }
    }
  }

  // Unimplemented members

  private _onDidChangeFile = new EventEmitter<FileChangeEvent[]>();
  public readonly onDidChangeFile: Event<FileChangeEvent[]> = this
    ._onDidChangeFile.event;

  watch(
    uri: Uri,
    options: { recursive: boolean; excludes: string[] }
  ): Disposable {
    return new Disposable(() => { });
  }
}

export let refreshFileSystem: (data: FileChangeEvent[]) => void;

export function registerFileSystemProvider(store: IStore) {
  const provider = new GistFileSystemProvider(store);
  refreshFileSystem = provider.refresh;

  workspace.registerFileSystemProvider(FS_SCHEME, provider);
  return provider;
}
