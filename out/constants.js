"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAILY_TEMPLATE_FILENAME = exports.DAILY_GIST_NAME = exports.ENCODED_DIRECTORY_SEPARATOR = exports.DIRECTORY_SEPARATOR = exports.ZERO_WIDTH_SPACE = exports.URI_PATTERN = exports.UNTITLED_SCHEME = exports.SWING_FILE = exports.INPUT_SCHEME = exports.FS_SCHEME = exports.EXTENSION_ID = exports.EXTENSION_NAME = void 0;
exports.EXTENSION_NAME = "gistpad";
exports.EXTENSION_ID = "vsls-contrib.gistfs";
exports.FS_SCHEME = "gist";
exports.INPUT_SCHEME = "input";
exports.SWING_FILE = "codeswing.json";
exports.UNTITLED_SCHEME = "untitled";
exports.URI_PATTERN = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
exports.ZERO_WIDTH_SPACE = "‎‎\u200B";
exports.DIRECTORY_SEPARATOR = "/";
exports.ENCODED_DIRECTORY_SEPARATOR = "---";
// This is the ID of the "magic" Gist that we create
// in order to store daily notes on behalf of the end-user.
exports.DAILY_GIST_NAME = "📆 Daily notes";
exports.DAILY_TEMPLATE_FILENAME = "template.md";
//# sourceMappingURL=constants.js.map