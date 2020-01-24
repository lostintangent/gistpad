import axios from "axios";
import * as vscode from "vscode";
import * as config from "../config";

interface Gallery {
  id: string;
  url: string;
  enabled: boolean;
  templates: GalleryTemplate[];
  label: string;
  description?: string;
}

interface GalleryTemplate {
  label: string;
  description?: string;
  gist: string;
}

const CONTRIBUTION_NAME = "gistpad.playgrounds.templateGalleries";

let loadGalleriesRunning = false;
let loadGalleriesPromise: Promise<Gallery[]> = Promise.resolve([]);

export async function loadGalleries() {
  if (loadGalleriesRunning) {
    return loadGalleriesPromise;
  }

  loadGalleriesPromise = new Promise(async (resolve) => {
    loadGalleriesRunning = true;

    const registrations = vscode.extensions.all.flatMap((e) => {
      return e.packageJSON.contributes &&
        e.packageJSON.contributes[CONTRIBUTION_NAME]
        ? e.packageJSON.contributes[CONTRIBUTION_NAME]
        : [];
    });

    const settingContributions = await config.get(
      "playgrounds.templateGalleries"
    );

    for (const gallery of settingContributions) {
      const registration = registrations.find(
        (registration) => registration.id === gallery
      );
      if (registration) {
        registration.enabled = true;
      } else if (gallery.startsWith("https://")) {
        registrations.push({
          id: gallery,
          url: gallery,
          enabled: true,
          label: "",
          description: ""
        });
      }
    }

    for (const registration of registrations) {
      if (!settingContributions.includes(registration.id)) {
        registration.enabled = false;
      }
    }

    const galleries = await Promise.all(
      registrations.map(async (gallery) => {
        const { data } = await axios.get(gallery.url);

        gallery.label = data.label;
        gallery.description = data.description;
        gallery.templates = data.templates.map((template: GalleryTemplate) => ({
          ...template,
          label: `${data.label}: ${template.label}`
        }));

        return gallery;
      })
    );

    loadGalleriesRunning = false;
    resolve(galleries);
  });

  return loadGalleriesPromise;
}

export async function enableGalleries(galleryIds: string[]) {
  await config.set("playgrounds.templateGalleries", galleryIds);
  return loadGalleries();
}

vscode.extensions.onDidChange(loadGalleries);
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration("gistpad.playgrounds.templateGalleries")) {
    loadGalleries();
  }
});

loadGalleries();
