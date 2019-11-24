import { commands, window } from "vscode";
import { getToken } from "./auth";
import { ZERO_WIDTH_SPACE } from "./constants";
import { openGist } from "./utils";

const Gists = require("gists");

export interface Gist {
    id: string;
    files: { string: GistFile };
    html_url: string;
    truncated: boolean;
    url: string;
}

export interface GistFile {
    content?: string;
    filename?: string;
    size?: number;
    truncated?: boolean;
}

async function getApi() {
    const token = await getToken();
    return new Gists({ token });
}

export async function getGist(id: string): Promise<Gist> {
    const api = await getApi();
    const gist = await api.get(id);
    return gist.body;
}

export async function deleteGist(id: string) {
    try {
    const api = await getApi();
      await api.delete(id);
      commands.executeCommand("workbench.action.closeFolder");
    } catch (e) {
      window.showErrorMessage(e);
    }
}

export async function forkGist(id: string) {
    try {
        const api = await getApi();
        const gist = await api.fork(id);
        openGist(gist.body.id);
    } catch (e) {
        window.showErrorMessage(e);
    }
}
  
export async function newGist(fileName: string, isPublic: boolean, description?: string) {
    const api = await getApi();
    const gist = await api.create({
      description,
      public: isPublic,
      files: {
        [fileName]: {
          content: ZERO_WIDTH_SPACE
        }
      }
    });
    openGist(gist.body.id);
}

export async function updateGist(id: string, filename: string, file: GistFile | null) {
    const api = await getApi();
    await api.edit(id, {
        files: {
          [filename]: file
        }
    });
}