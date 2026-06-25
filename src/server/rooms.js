/**
 * Room state management.
 * @module rooms
 */

const crypto = require("crypto");

/**
 * @typedef {object} Room
 * @property {string} id - Unique room identifier.
 * @property {string} key - Room access key.
 * @property {string} name - Optional human-readable name.
 * @property {Map<string, object>} clients - Connected participants.
 * @property {object[]} messages - Recent chat messages.
 * @property {Map<string, object>} files - Files shared in the room.
 * @property {number} filesBytes - Total bytes of stored files.
 * @property {number} lastActiveAt - Last activity timestamp.
 */
const {
  MAX_CHAT_HISTORY
} = require("./constants");
const {
  MAX_ROOM_FILES,
  MAX_ROOM_FILE_BYTES,
  FILE_TTL_MS,
  ROOM_TTL_MS
} = require("./config");

/**
 * Active rooms keyed by room id.
 * @type {Map<string, Room>}
 */
const rooms = new Map();

/**
 * Mapping from normalized room name to room id.
 * @type {Map<string, string>}
 */
const roomsByName = new Map();

/**
 * Normalize a room or participant name for comparison.
 * @param {string} value - Raw name.
 * @returns {string} Lowercase trimmed name.
 */
const normalizeName = (value) => String(value || "").trim().toLowerCase();

/**
 * Generate a URL-safe random token.
 * @param {number} bytes - Number of random bytes.
 * @returns {string} Base64url token.
 */
const createToken = (bytes) =>
  crypto.randomBytes(bytes).toString("base64url").replace(/_/g, "a");

/**
 * Create a plain room object.
 * @param {string} roomId - Unique room identifier.
 * @param {string} roomKey - Room access key.
 * @param {string} [roomName=""] - Optional human-readable name.
 * @param {object[]} [messages=[]] - Initial chat messages.
 * @returns {Room} New room object.
 */
const createRoomObject = (roomId, roomKey, roomName = "", messages = []) => ({
  id: roomId,
  key: roomKey,
  name: roomName || "",
  clients: new Map(),
  messages: Array.isArray(messages) ? messages.slice(-MAX_CHAT_HISTORY) : [],
  files: new Map(),
  filesBytes: 0,
  lastActiveAt: Date.now()
});

/**
 * Register a room in the active set.
 * @param {Room} room - Room to register.
 * @returns {void}
 */
const registerRoom = (room) => {
  rooms.set(room.id, room);
  if (room.name) {
    roomsByName.set(normalizeName(room.name), room.id);
  }
};

/**
 * Remove a room from the active set.
 * Does nothing if the room still has connected clients.
 * @param {Room} room - Room to unregister.
 * @returns {void}
 */
const unregisterRoom = (room) => {
  if (!room) {
    return;
  }
  if (room.clients.size > 0) {
    return;
  }
  rooms.delete(room.id);
  if (room.name) {
    roomsByName.delete(normalizeName(room.name));
  }
  room.files.clear();
  room.filesBytes = 0;
};

/**
 * Update a room's last activity timestamp.
 * @param {Room} room - Room to touch.
 * @returns {void}
 */
const markRoomActivity = (room) => {
  if (!room) {
    return;
  }
  room.lastActiveAt = Date.now();
};

/**
 * Remove a single file from a room.
 * @param {Room} room - Owner room.
 * @param {string} fileId - File identifier.
 * @param {object} [knownFile=null] - Optional cached file object.
 * @returns {boolean} Whether a file was removed.
 */
const dropRoomFile = (room, fileId, knownFile = null) => {
  const file = knownFile || room.files.get(fileId);
  if (!file) {
    return false;
  }
  if (room.files.delete(fileId) && Number.isFinite(file.size)) {
    room.filesBytes = Math.max(0, room.filesBytes - file.size);
    return true;
  }
  return false;
};

/**
 * Remove the oldest file from a room.
 * @param {Room} room - Owner room.
 * @returns {boolean} Whether a file was removed.
 */
const removeOldestRoomFile = (room) => {
  const oldest = room.files.entries().next();
  if (oldest.done) {
    return false;
  }
  const [fileId, file] = oldest.value;
  return dropRoomFile(room, fileId, file);
};

/**
 * Check whether a room file has expired.
 * @param {object} file - File object.
 * @param {number} now - Current timestamp.
 * @returns {boolean} True if expired.
 */
const isFileExpired = (file, now) => {
  if (!file || !Number.isFinite(file.createdAt)) {
    return true;
  }
  return now - file.createdAt > FILE_TTL_MS;
};

/**
 * Delete expired files from a room.
 * @param {Room} room - Room to prune.
 * @param {number} [now=Date.now()] - Current timestamp.
 * @returns {void}
 */
const pruneExpiredRoomFiles = (room, now = Date.now()) => {
  for (const [fileId, file] of room.files) {
    if (isFileExpired(file, now)) {
      dropRoomFile(room, fileId, file);
    }
  }
};

/**
 * Make room for an incoming file by removing oldest files.
 * @param {Room} room - Target room.
 * @param {number} incomingSize - Size of the incoming file in bytes.
 * @param {number} [now=Date.now()] - Current timestamp.
 * @returns {boolean} Whether there is enough capacity.
 */
const ensureRoomFileCapacity = (room, incomingSize, now = Date.now()) => {
  if (!Number.isFinite(incomingSize) || incomingSize <= 0) {
    return false;
  }

  pruneExpiredRoomFiles(room, now);

  if (incomingSize > MAX_ROOM_FILE_BYTES) {
    return false;
  }

  while (room.files.size >= MAX_ROOM_FILES) {
    if (!removeOldestRoomFile(room)) {
      break;
    }
  }

  while (room.filesBytes + incomingSize > MAX_ROOM_FILE_BYTES) {
    if (!removeOldestRoomFile(room)) {
      break;
    }
  }

  return room.filesBytes + incomingSize <= MAX_ROOM_FILE_BYTES;
};

/**
 * Delete stale rooms and expired files.
 * @returns {void}
 */
const cleanupRooms = () => {
  const now = Date.now();
  for (const room of Array.from(rooms.values())) {
    pruneExpiredRoomFiles(room, now);
    if (room.clients.size > 0) {
      markRoomActivity(room);
      continue;
    }
    if (now - room.lastActiveAt > ROOM_TTL_MS) {
      unregisterRoom(room);
    }
  }
};

/**
 * Create and register a new room.
 * @param {string} [roomName=""] - Optional room name.
 * @returns {Room} The created room.
 */
const createRoom = (roomName = "") => {
  let roomId;
  do {
    roomId = createToken(6).slice(0, 8);
  } while (rooms.has(roomId));

  const roomKey = createToken(12).slice(0, 16);
  const room = createRoomObject(roomId, roomKey, roomName || "");
  registerRoom(room);
  return room;
};

/**
 * Lookup a room by id.
 * @param {string} roomId - Room identifier.
 * @returns {Room|undefined} Room object or undefined.
 */
const getRoom = (roomId) => rooms.get(roomId);

/**
 * Build a participant list for a room.
 * @param {Room} room - Target room.
 * @returns {object[]} Participant summaries.
 */
const listParticipants = (room) => {
  const participants = [];
  for (const { id, name, muted, active, color, shape } of room.clients.values()) {
    participants.push({ id, name, muted, active, color, shape });
  }
  return participants;
};

/**
 * Append a message to a room's chat history.
 * @param {Room} room - Target room.
 * @param {object} message - Message payload.
 * @returns {void}
 */
const pushRoomMessage = (room, message) => {
  room.messages.push(message);
  if (room.messages.length > MAX_CHAT_HISTORY) {
    room.messages.splice(0, room.messages.length - MAX_CHAT_HISTORY);
  }
  markRoomActivity(room);
};

module.exports = {
  rooms,
  roomsByName,
  normalizeName,
  createToken,
  createRoomObject,
  registerRoom,
  unregisterRoom,
  markRoomActivity,
  dropRoomFile,
  removeOldestRoomFile,
  isFileExpired,
  pruneExpiredRoomFiles,
  ensureRoomFileCapacity,
  cleanupRooms,
  createRoom,
  getRoom,
  listParticipants,
  pushRoomMessage
};
