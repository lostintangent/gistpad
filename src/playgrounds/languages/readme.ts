export const README_BASE_NAME = "README";

export const README_EXTENSIONS = [".md", ".markdown"];

export function getReadmeContent(readme: string): string | null {
  if (readme.trim() === "") {
    return readme;
  }

  const markdown = require("markdown-it")();

  try {
    // Something failed when trying to transpile Pug,
    // so don't attempt to return anything
    return markdown.render(readme);
  } catch (e) {
    return null;
  }
}
