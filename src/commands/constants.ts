export const DEFAULT_MANIFEST = {
  scripts: [] as string[],
  styles: [] as string[]
};
export const MarkupLanguage = {
  html: ".html",
  pug: ".pug"
};
export const MARKUP_EXTENSIONS = [MarkupLanguage.html, MarkupLanguage.pug];
export const StylesheetLanguage = {
  css: ".css",
  less: ".less",
  sass: ".sass",
  scss: ".scss"
};
export const STYLESHEET_EXTENSIONS = [
  StylesheetLanguage.css,
  StylesheetLanguage.less,
  StylesheetLanguage.sass,
  StylesheetLanguage.scss
];
export const ScriptLanguage = {
  babel: ".babel",
  javascript: ".js",
  javascriptmodule: ".mjs",
  javascriptreact: ".jsx",
  typescript: ".ts",
  typescriptreact: ".tsx"
};
export const REACT_EXTENSIONS = [
  ScriptLanguage.babel,
  ScriptLanguage.javascriptreact,
  ScriptLanguage.typescriptreact
];
const MODULE_EXTENSIONS = [ScriptLanguage.javascriptmodule];
export const TYPESCRIPT_EXTENSIONS = [
  ScriptLanguage.typescript,
  ...REACT_EXTENSIONS
];
export const SCRIPT_EXTENSIONS = [
  ScriptLanguage.javascript,
  ...MODULE_EXTENSIONS,
  ...TYPESCRIPT_EXTENSIONS
];
