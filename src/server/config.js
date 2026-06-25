/**
 * Environment configuration loader.
 *
 * Reads `.env` from the project root and exposes typed config values.
 * Variables already present in `process.env` take precedence.
 * @module config
 */

const fs = require("fs");
const path = require("path");

/**
 * Project root directory.
 * @type {string}
 */
const ROOT_DIR = path.resolve(__dirname, "..", "..");

/**
 * Path to the `.env` file.
 * @type {string}
 */
const ENV_PATH = path.join(ROOT_DIR, ".env");

/**
 * Read and parse the `.env` file into `process.env`.
 * Ignores blank lines, comments, and keys already set.
 * @returns {void}
 */
const loadEnvFile = () => {
  let text;
  try {
    text = fs.readFileSync(ENV_PATH, "utf8");
  } catch {
    return;
  }

  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || typeof process.env[key] !== "undefined") {
      return;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  });
};

loadEnvFile();

/**
 * Parsed port number.
 * @type {number}
 */
const PORT = Number(process.env.PORT || 3000);

/**
 * Absolute path to the SQLite database file.
 * @type {string}
 */
const DB_PATH = path.resolve(
  process.env.DB_PATH || path.join(ROOT_DIR, "data", "telemost.db")
);

/**
 * Comma-separated TURN server URLs.
 * @type {string}
 */
const TURN_URLS = String(process.env.TURN_URLS || process.env.TURN_URL || "").trim();

/**
 * TURN server username.
 * @type {string}
 */
const TURN_USER = String(process.env.TURN_USER || "").trim();

/**
 * TURN server password/credential.
 * @type {string}
 */
const TURN_PASS = String(process.env.TURN_PASS || "").trim();

/**
 * Maximum number of files stored per room.
 * @type {number}
 */
const MAX_ROOM_FILES = Number(process.env.MAX_ROOM_FILES || 20);

/**
 * Maximum total bytes of files stored per room.
 * @type {number}
 */
const MAX_ROOM_FILE_BYTES = Number(process.env.MAX_ROOM_FILE_BYTES || 1024 * 1024 * 1024);

/**
 * File lifetime in milliseconds.
 * @type {number}
 */
const FILE_TTL_MS = Number(process.env.FILE_TTL_MS || 30 * 60 * 1000);

/**
 * Room lifetime in milliseconds.
 * @type {number}
 */
const ROOM_TTL_MS = Number(process.env.ROOM_TTL_MS || 6 * 60 * 60 * 1000);

/**
 * Cleanup interval in milliseconds.
 * @type {number}
 */
const CLEANUP_INTERVAL_MS = Number(process.env.CLEANUP_INTERVAL_MS || 60 * 1000);

/**
 * Maximum file size expressed in megabytes for Express raw body parser.
 * @type {number}
 */
const MAX_FILE_SIZE_MB = Math.max(
  1,
  Math.ceil(500 * 1024 * 1024 / (1024 * 1024))
);

module.exports = {
  ROOT_DIR,
  ENV_PATH,
  PORT,
  DB_PATH,
  TURN_URLS,
  TURN_USER,
  TURN_PASS,
  MAX_ROOM_FILES,
  MAX_ROOM_FILE_BYTES,
  FILE_TTL_MS,
  ROOM_TTL_MS,
  CLEANUP_INTERVAL_MS,
  MAX_FILE_SIZE_MB
};
