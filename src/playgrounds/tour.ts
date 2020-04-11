import { extensions, Uri } from "vscode";
import { getFileContents } from "../fileSystem/api";
import { GistFile } from "../store";

export const TOUR_FILE = "tour.json";

interface CodeTourApi {
  startTour(
    tour: any,
    stepNumber: number,
    workspaceRoot: Uri,
    startInEditMode: boolean,
    canEdit: boolean
  ): void;
  endCurrentTour(): void;
  exportTour(tour: any): string;
}

let codeTourApi: CodeTourApi;
export async function ensureApi() {
  if (!codeTourApi) {
    const codeTour = extensions.getExtension("vsls-contrib.codetour");
    if (!codeTour) {
      return;
    }
    if (!codeTour.isActive) {
      await codeTour.activate();
    }

    codeTourApi = codeTour.exports;
  }
}

export async function isCodeTourInstalled() {
  await ensureApi();
  return !!codeTourApi;
}

export async function startTour(
  tour: any,
  workspaceRoot: Uri,
  startInEditMode: boolean = false,
  canEdit: boolean = true
) {
  await ensureApi();

  tour.id = `${workspaceRoot.toString()}/${TOUR_FILE}`;
  codeTourApi.startTour(tour, 0, workspaceRoot, startInEditMode, canEdit);
}

export async function startTourFromFile(
  tourFile: GistFile,
  workspaceRoot: Uri,
  startInEditMode: boolean = false,
  canEdit: boolean = true
) {
  await ensureApi();

  const tourContent = await getFileContents(tourFile);
  if (!tourContent) {
    return;
  }

  try {
    const tour = JSON.parse(tourContent);
    startTour(tour, workspaceRoot, startInEditMode, canEdit);
  } catch (e) {}
}

export async function endCurrentTour() {
  await ensureApi();

  codeTourApi.endCurrentTour();
}

export async function exportTour(tour: any) {
  await ensureApi();

  return codeTourApi.exportTour(tour);
}
