/**
 * SQLite persistence layer for rooms and messages.
 * @module persistence
 */

const fs = require("fs");
const path = require("path");
const { DB_PATH } = require("./config");
const { MAX_CHAT_HISTORY } = require("./constants");
const { createRoomObject, registerRoom } = require("./rooms");

/**
 * Placeholder for the better-sqlite3 Database class.
 * The app does not require SQLite by default; it is only used when available.
 * @type {Function|null}
 */
let Database = null;

try {
  Database = require("better-sqlite3");
} catch {
  Database = null;
}

/**
 * Internal persistence state.
 * @type {object}
 */
const persistence = {
  enabled: false,
  db: null,
  insertRoomStmt: null,
  touchRoomStmt: null,
  insertMessageStmt: null,
  trimMessagesStmt: null,
  loadRoomsStmt: null,
  loadMessagesStmt: null
};

/**
 * Strip large inline data from a message before storing it.
 * @param {object} message - Chat or file message.
 * @returns {object|null} Storable message clone or null.
 */
const toPersistedMessage = (message) => {
  if (!message || typeof message !== "object") {
    return null;
  }

  if (message.type === "file" && message.file && typeof message.file === "object") {
    const file = { ...message.file };
    if (typeof file.dataUrl === "string") {
      delete file.dataUrl;
      file.inlineDataDropped = true;
    }
    return { ...message, file };
  }

  return message;
};

/**
 * Parse a JSON message payload loaded from SQLite.
 * @param {string} raw - JSON string.
 * @returns {object|null} Parsed message or null.
 */
const parsePersistedMessage = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Persist a new or updated room.
 * @param {Room} room - Room to persist.
 * @returns {void}
 */
const persistRoom = (room) => {
  if (!persistence.enabled || !room) {
    return;
  }
  const now = Date.now();
  persistence.insertRoomStmt.run(room.id, room.key, room.name || "", now, now);
};

/**
 * Update a room's last activity timestamp in SQLite.
 * @param {string} roomId - Room identifier.
 * @returns {void}
 */
const persistRoomActivity = (roomId) => {
  if (!persistence.enabled || !roomId) {
    return;
  }
  persistence.touchRoomStmt.run(Date.now(), roomId);
};

/**
 * Persist a chat message.
 * @param {string} roomId - Room identifier.
 * @param {object} message - Message payload.
 * @returns {void}
 */
const persistMessage = (roomId, message) => {
  if (!persistence.enabled || !roomId) {
    return;
  }

  const value = toPersistedMessage(message);
  if (!value) {
    return;
  }

  const ts = Number(value.ts) || Date.now();
  persistence.insertMessageStmt.run(roomId, JSON.stringify(value), ts);
  persistence.trimMessagesStmt.run(roomId, roomId, MAX_CHAT_HISTORY);
  persistRoomActivity(roomId);
};

/**
 * Load persisted rooms and their messages into memory.
 * @returns {void}
 */
const loadPersistedRooms = () => {
  if (!persistence.enabled) {
    return;
  }

  const rows = persistence.loadRoomsStmt.all();
  for (const row of rows) {
    if (!row.id || !row.key) {
      continue;
    }

    const messageRows = persistence.loadMessagesStmt.all(row.id, MAX_CHAT_HISTORY);
    const messages = messageRows
      .slice()
      .reverse()
      .map((messageRow) => parsePersistedMessage(messageRow.payload))
      .filter(Boolean);

    const room = createRoomObject(row.id, row.key, row.name || "", messages);
    registerRoom(room);
  }
};

/**
 * Initialize SQLite persistence if better-sqlite3 is available.
 * @returns {void}
 */
const initPersistence = () => {
  if (!Database) {
    return;
  }

  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        last_active_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        ts INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_room_id_id
      ON messages(room_id, id DESC);
    `);

    persistence.enabled = true;
    persistence.db = db;
    persistence.insertRoomStmt = db.prepare(`
      INSERT INTO rooms (id, key, name, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        key = excluded.key,
        name = excluded.name,
        last_active_at = excluded.last_active_at
    `);
    persistence.touchRoomStmt = db.prepare(`
      UPDATE rooms
      SET last_active_at = ?
      WHERE id = ?
    `);
    persistence.insertMessageStmt = db.prepare(`
      INSERT INTO messages (room_id, payload, ts)
      VALUES (?, ?, ?)
    `);
    persistence.trimMessagesStmt = db.prepare(`
      DELETE FROM messages
      WHERE room_id = ?
        AND id NOT IN (
          SELECT id
          FROM messages
          WHERE room_id = ?
          ORDER BY id DESC
          LIMIT ?
        )
    `);
    persistence.loadRoomsStmt = db.prepare(`
      SELECT id, key, name
      FROM rooms
      ORDER BY created_at ASC
    `);
    persistence.loadMessagesStmt = db.prepare(`
      SELECT payload
      FROM messages
      WHERE room_id = ?
      ORDER BY id DESC
      LIMIT ?
    `);

    loadPersistedRooms();
  } catch (err) {
    process.stderr.write(`SQLite init failed: ${err instanceof Error ? err.message : String(err)}\n`);
  }
};

module.exports = {
  persistRoom,
  persistRoomActivity,
  persistMessage,
  initPersistence,
  loadPersistedRooms
};
