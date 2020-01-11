import * as vscode from 'vscode';
import { log } from "../logger";
import * as memento from '../memento';
import { Gist } from "../store";

const GIST_UPDATES_MEMENTO_KEY = 'gistpad.gist.updates';

const getSectionMementoKey = (sectionName: string) => {
  return `${GIST_UPDATES_MEMENTO_KEY}.${sectionName}`;
}


type GistChange = 'modify' | 'add' | 'remove';
type GistFileChange = 'modify' | 'add' | 'remove';

export interface IGistDiff {
  gistId: string;
  lastSeenUpdateTime: string | null;
  currentUpdateTime: string | null;
  fileChanged: GistFileChange[];
  changeType: GistChange;
}

// interface IGistUpdateRecord {
//   gistId: string;
//   lastSeenCommitId: string;
//   files: string[];
// }

export const removeGistRecordsForSection = (sectionName: string) => {
  memento.set(getSectionMementoKey(sectionName), '');
}

const writeGistRecordsForSection = (sectionName: string, gists: Gist[]) => {
  memento.set(getSectionMementoKey(sectionName), JSON.stringify(gists));
}

const readGistRecordsForSection = (sectionName: string): Gist[] | undefined => {
  const maybeGistsString = memento.get(getSectionMementoKey(sectionName));

  if (!maybeGistsString) {
    return;
  }

  try {
    const gists = JSON.parse(maybeGistsString);

    return gists;
  } catch (e) {
    log.error(`Got gists record for the "${sectionName}" section, but failed to parse. ${e.message}`);
  }
}

const findGistInTheList = (gist: Gist, inGistsList: Gist[]) => {
  for (let gistInTheList of inGistsList) {
    if (gist.id === gistInTheList.id) {
      return gistInTheList;
    }
  }
}

const getGistUpdateTime = (gist: Gist) => {
  return gist.updated_at;
}

const createGistAddDiff = (currentGist: Gist): IGistDiff => {
  return (
    {
      gistId: currentGist.id,
      lastSeenUpdateTime: null,
      currentUpdateTime: getGistUpdateTime(currentGist),
      fileChanged: [],
      changeType: 'add'
    }
  );
}

const createGistModifyDiff = (currentGist: Gist, previousGist: Gist): IGistDiff => {
  return (
    {
      gistId: currentGist.id,
      lastSeenUpdateTime: getGistUpdateTime(previousGist),
      currentUpdateTime: getGistUpdateTime(currentGist),
      fileChanged: [],
      changeType: 'modify'
    }
  );
}

const createGistRemoveDiff = (previousGist: Gist): IGistDiff => {
  return (
    {
      gistId: previousGist.id,
      lastSeenUpdateTime: getGistUpdateTime(previousGist),
      currentUpdateTime: null,
      fileChanged: [],
      changeType: 'remove'
    }
  );
}

const diffGistRecords = (gistRecordsBefore: Gist[], currentGistRecords: Gist[]): IGistDiff[] => {
  const result: IGistDiff[] = [];

  for (let currentGist of currentGistRecords) {
    const previousGist = findGistInTheList(currentGist, gistRecordsBefore);

    /**
     *  If there is no previous version of this gist recorded, the gist was `add`ed.
     */
    if (!previousGist) {
      result.push(
        createGistAddDiff(currentGist)
      );

      continue;
    }

    if (previousGist.updated_at !== currentGist.updated_at) {
      result.push(
        createGistModifyDiff(currentGist, previousGist)
      );
    }
  }

  /**
   * Check for deleted gists.
   */
  for (let previousGist of gistRecordsBefore) {
    const currentGist = findGistInTheList(previousGist, currentGistRecords);

    /**
     *  If there is no current version previously seen gists, the gist `remove`ed.
     */
    if (!currentGist) {
      result.push(
        createGistRemoveDiff(previousGist)
      );

      continue;
    }
  }


  return result;
}

let diff: IGistDiff[] = [];

// function createResourceUri(relativePath: string): vscode.Uri {
//   const absolutePath = path.join(vscode.workspace.rootPath!, relativePath);
//   return vscode.Uri.file(absolutePath);
// }

class QuickDiff implements vscode.QuickDiffProvider {

  private _onDidChangeOriginalResource = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChangeOriginalResource: vscode.Event<vscode.Uri> = this._onDidChangeOriginalResource.event;

  async provideOriginalResource(uri: vscode.Uri, token?: vscode.CancellationToken) {
    const gistDiff = diff.find((d) => {
      return (d.gistId === uri.authority);
    });

    if (!gistDiff) {
      return;
    }

    const resultUri = uri.with({ authority: `diff__${uri.authority}` });

    return resultUri;
  }
}

const gistPadSCM = vscode.scm.createSourceControl('gistpad', 'GistPad');

export const restQuickDiff = () => {
  gistPadSCM.quickDiffProvider = new QuickDiff();
}

restQuickDiff();

// const index = gistPadSCM.createResourceGroup('index', 'Gistpad Updates');
// index.
// index.resourceStates = [
//     { resourceUri: createResourceUri('README.md') },
//     { resourceUri: vscode.Uri.file(path.join(vscode.workspace.rootPath!, '/test/api/a.ts')) },
//     { resourceUri: vscode.Uri.file(path.join(vscode.workspace.rootPath!, '/test/api/b.ts')) },
//     { resourceUri: vscode.Uri.file(path.join(vscode.workspace.rootPath!, '/test/api/c.ts')) },
// ];

export const gistsSectionOpen = (sectionName: string, newGists: Gist[]) => {
  const gists = readGistRecordsForSection(sectionName);

  if (!gists) {
    log.info(`No previous gists for the "${sectionName}".`);

    writeGistRecordsForSection(sectionName, newGists);

    return [];
  }

  const gistsDiff = diffGistRecords(gists, newGists);

  diff = gistsDiff;

  return gistsDiff;
}

export const markGistUpdateAsSeen = (sectionName: string, gist: Gist) => {
  let gists = readGistRecordsForSection(sectionName) || [];

  const savedGist = gists.find((g) => {
    return (g.id === gist.id);
  });

  if (savedGist) {
    gists = gists.filter((g) => {
      return (g.id !== gist.id);
    });
  }

  gists.push(gist);

  // remove gist diff
  diff = diff.filter((d) => {
    return (d.gistId !== gist.id);
  });

  writeGistRecordsForSection(sectionName, gists);
}

export const getGistDiff = (gistId: string) => {
  const maybeGist = diff.find((g) => {
    return (g.gistId === gistId);
  });

  return maybeGist;
}