export const EXTENSION_ID = "gistpad";
export const FS_SCHEME = "gist";
export const UNTITLED_SCHEME = "untitled";
export const ZERO_WIDTH_SPACE = "‎‎\u200B";

export const PLAYGROUND_JSON_FILE = "playground.json";

export const CommandId = {
  openGist: `${EXTENSION_ID}.openGist`
} as const;

export const URI_PATTERN = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
