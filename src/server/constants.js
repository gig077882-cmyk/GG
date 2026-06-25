/**
 * Server-wide numeric limits and magic values.
 * @module constants
 */

/**
 * Maximum length of a participant display name.
 * @type {number}
 */
const MAX_NAME_LENGTH = 24;

/**
 * Maximum length of a room name.
 * @type {number}
 */
const MAX_ROOM_NAME = 40;

/**
 * Maximum length of a single chat message.
 * @type {number}
 */
const MAX_CHAT_LENGTH = 500;

/**
 * Maximum number of chat messages kept per room.
 * @type {number}
 */
const MAX_CHAT_HISTORY = 100;

/**
 * Maximum number of global chat messages kept.
 * @type {number}
 */
const MAX_GLOBAL_CHAT_HISTORY = 200;

/**
 * Maximum size of a single uploaded file in bytes.
 * @type {number}
 */
const MAX_FILE_SIZE = 500 * 1024 * 1024;

/**
 * Maximum length of a file name.
 * @type {number}
 */
const MAX_FILE_NAME = 120;

/**
 * Default number of files allowed per room.
 * @type {number}
 */
const DEFAULT_MAX_ROOM_FILES = 20;

/**
 * Default total bytes allowed for room files.
 * @type {number}
 */
const DEFAULT_MAX_ROOM_FILE_BYTES = 1024 * 1024 * 1024;

/**
 * Default file lifetime in milliseconds.
 * @type {number}
 */
const DEFAULT_FILE_TTL_MS = 30 * 60 * 1000;

/**
 * Default room lifetime in milliseconds.
 * @type {number}
 */
const DEFAULT_ROOM_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Default interval between cleanup runs in milliseconds.
 * @type {number}
 */
const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 1000;

module.exports = {
  MAX_NAME_LENGTH,
  MAX_ROOM_NAME,
  MAX_CHAT_LENGTH,
  MAX_CHAT_HISTORY,
  MAX_GLOBAL_CHAT_HISTORY,
  MAX_FILE_SIZE,
  MAX_FILE_NAME,
  DEFAULT_MAX_ROOM_FILES,
  DEFAULT_MAX_ROOM_FILE_BYTES,
  DEFAULT_FILE_TTL_MS,
  DEFAULT_ROOM_TTL_MS,
  DEFAULT_CLEANUP_INTERVAL_MS
};
