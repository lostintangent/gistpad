export type ScriptType = "text/javascript" | "module";
export enum PlaygroundLibraryType {
  script = "scripts",
  style = "styles"
}
export enum PlaygroundFileType {
  markup,
  script,
  stylesheet,
  manifest
}
export interface GalleryTemplate {
  label: string;
  description: string;
  gist: string;
}
