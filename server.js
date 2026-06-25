const path = require("path");
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const express = require("express");
const { WebSocketServer } = require("ws");

const Database = null;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const loadEnvFile = () => {
  const envPath = path.join(__dirname, ".env");
  let text = "";
  try {
    text = fs.readFileSync(envPath, "utf8");
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

const port = Number(process.env.PORT || 3000);

const publicPath = path.join(__dirname, "public");
const rnnoisePath = path.join(
  __dirname,
  "node_modules",
  "@jitsi",
  "rnnoise-wasm",
  "dist",
  "rnnoise-sync.js"
);
app.use(express.json());
app.use(express.static(publicPath));
app.get("/vendor/rnnoise-sync.js", (req, res) => {
  res.sendFile(rnnoisePath);
});

const rooms = new Map();
const roomsByName = new Map();

const MAX_NAME_LENGTH = 24;
const MAX_ROOM_NAME = 40;
const MAX_CHAT_LENGTH = 500;
const MAX_CHAT_HISTORY = 100;
const MAX_GLOBAL_CHAT_HISTORY = 200;
const MAX_FILE_SIZE = 500 * 1024 * 1024;
const MAX_FILE_NAME = 120;
const MAX_ROOM_FILES = Number(process.env.MAX_ROOM_FILES || 20);
const MAX_ROOM_FILE_BYTES = Number(process.env.MAX_ROOM_FILE_BYTES || 1024 * 1024 * 1024);
const FILE_TTL_MS = Number(process.env.FILE_TTL_MS || 30 * 60 * 1000);
const ROOM_TTL_MS = Number(process.env.ROOM_TTL_MS || 6 * 60 * 60 * 1000);
const CLEANUP_INTERVAL_MS = Number(process.env.CLEANUP_INTERVAL_MS || 60 * 1000);
const MAX_FILE_SIZE_MB = Math.max(1, Math.ceil(MAX_FILE_SIZE / (1024 * 1024)));
const DB_PATH = path.resolve(process.env.DB_PATH || path.join(__dirname, "data", "telemost.db"));

const createToken = (bytes) =>
  crypto.randomBytes(bytes).toString("base64url").replace(/_/g, "a");

const normalizeName = (value) => value.trim().toLowerCase();
const normalizeDisplayName = (value) =>
  String(value || "").trim().slice(0, MAX_NAME_LENGTH) || "Гость";

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

const registerRoom = (room) => {
  rooms.set(room.id, room);
  if (room.name) {
    roomsByName.set(normalizeName(room.name), room.id);
  }
};

const unregisterRoom = (room) => {
  if (!room) {
    return;
  }
  // Safety guard: never remove a room while someone is still connected.
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

const markRoomActivity = (room) => {
  if (!room) {
    return;
  }
  room.lastActiveAt = Date.now();
  persistRoomActivity(room.id);
};

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

const removeOldestRoomFile = (room) => {
  const oldest = room.files.entries().next();
  if (oldest.done) {
    return false;
  }
  const [fileId, file] = oldest.value;
  return dropRoomFile(room, fileId, file);
};

const isFileExpired = (file, now) => {
  if (!file || !Number.isFinite(file.createdAt)) {
    return true;
  }
  return now - file.createdAt > FILE_TTL_MS;
};

const pruneExpiredRoomFiles = (room, now = Date.now()) => {
  for (const [fileId, file] of room.files) {
    if (isFileExpired(file, now)) {
      dropRoomFile(room, fileId, file);
    }
  }
};

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

const persistRoom = (room) => {
  if (!persistence.enabled || !room) {
    return;
  }
  const now = Date.now();
  persistence.insertRoomStmt.run(room.id, room.key, room.name || "", now, now);
};

const persistRoomActivity = (roomId) => {
  if (!persistence.enabled || !roomId) {
    return;
  }
  persistence.touchRoomStmt.run(Date.now(), roomId);
};

const toPersistedMessage = (message) => {
  if (!message || typeof message !== "object") {
    return null;
  }
  if (message.type === "file" && message.file && typeof message.file === "object") {
    // Avoid storing large base64 payloads in SQLite.
    const file = { ...message.file };
    if (typeof file.dataUrl === "string") {
      delete file.dataUrl;
      file.inlineDataDropped = true;
    }
    return { ...message, file };
  }
  return message;
};

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

const parsePersistedMessage = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

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

const isNameTaken = (room, name, exceptId = null) => {
  const target = normalizeName(name);
  for (const client of room.clients.values()) {
    if (client.id !== exceptId && normalizeName(client.name) === target) {
      return true;
    }
  }
  return false;
};

const getUniqueName = (room, baseName, exceptId = null) => {
  const base = baseName.trim() || "Гость";
  if (!isNameTaken(room, base, exceptId)) {
    return base;
  }
  let index = 2;
  let candidate = `${base} ${index}`;
  while (isNameTaken(room, candidate, exceptId)) {
    index += 1;
    candidate = `${base} ${index}`;
  }
  return candidate;
};

const createRoom = (roomName) => {
  let roomId = "";
  let roomKey = "";
  do {
    roomId = createToken(6).slice(0, 8);
  } while (rooms.has(roomId));
  roomKey = createToken(12).slice(0, 16);
  const room = createRoomObject(roomId, roomKey, roomName || "");
  registerRoom(room);
  persistRoom(room);
  return room;
};

const getRoom = (roomId) => rooms.get(roomId);

const listParticipants = (room) => {
  const participants = [];
  for (const { id, name, muted, active, color, shape } of room.clients.values()) {
    participants.push({ id, name, muted, active, color, shape });
  }
  return participants;
};

const buildIceServers = () => {
  const servers = [{ urls: "stun:stun.l.google.com:19302" }];
  const turnUrls = String(process.env.TURN_URLS || process.env.TURN_URL || "").trim();
  if (turnUrls) {
    const urls = turnUrls.split(",").map((value) => value.trim()).filter(Boolean);
    if (urls.length) {
      servers.push({
        urls,
        username: process.env.TURN_USER || "",
        credential: process.env.TURN_PASS || ""
      });
    }
  }
  return servers;
};

const pushRoomMessage = (room, message) => {
  room.messages.push(message);
  if (room.messages.length > MAX_CHAT_HISTORY) {
    room.messages.splice(0, room.messages.length - MAX_CHAT_HISTORY);
  }
  markRoomActivity(room);
  persistMessage(room.id, message);
};

app.get("/api/create", (req, res) => {  let name = String(req.query.name || "").trim();
  if (name) {
    name = name.slice(0, MAX_ROOM_NAME);
    const normalized = normalizeName(name);
    if (roomsByName.has(normalized)) {
      res.status(409).json({ error: "Комната с таким названием уже существует" });
      return;
    }
  }
  const room = createRoom(name);
  const host = req.get("host");
  const protocol = req.protocol;
  const joinUrl = `${protocol}://${host}/#room=${room.id}&key=${room.key}`;
  res.json({ roomId: room.id, key: room.key, joinUrl, name: room.name });
});

app.get("/api/resolve", (req, res) => {
  const name = String(req.query.name || "").trim();
  if (!name) {
    res.status(400).json({ error: "Имя комнаты не указано" });
    return;
  }
  const normalized = normalizeName(name);
  const roomId = roomsByName.get(normalized);
  if (!roomId) {
    res.status(404).json({ error: "Комната не найдена" });
    return;
  }
  const room = getRoom(roomId);
  if (!room) {
    roomsByName.delete(normalized);
    res.status(404).json({ error: "Комната не найдена" });
    return;
  }
  res.json({ roomId });
});

app.get("/api/ice", (req, res) => {
  res.json({ iceServers: buildIceServers() });
});

app.post(
  "/api/upload",
  express.raw({ type: "*/*", limit: `${MAX_FILE_SIZE_MB}mb` }),
  (req, res) => {
    const roomId = String(req.get("x-room-id") || "");
    const key = String(req.get("x-room-key") || "");
    const nameRaw = String(req.get("x-file-name") || "");
    const mime = String(req.get("x-file-type") || "");
    const sizeHeader = Number(req.get("x-file-size") || 0);
    const room = getRoom(roomId);
    if (!room || room.key !== key) {
      res.status(403).json({ error: "Комната не найдена или ключ неверен" });
      return;
    }
    if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: "Файл не принят" });
      return;
    }
    const size = req.body.length;
    if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE) {
      res.status(413).json({ error: "Файл не принят" });
      return;
    }
    if (sizeHeader && Math.abs(sizeHeader - size) > 5) {
      res.status(400).json({ error: "Файл не принят" });
      return;
    }
    if (!ensureRoomFileCapacity(room, size)) {
      res.status(413).json({ error: "Файл не принят" });
      return;
    }
    const safeName = nameRaw.trim().slice(0, MAX_FILE_NAME) || "file";
    const fileId = createToken(12).slice(0, 16);
    room.files.set(fileId, {
      id: fileId,
      name: safeName,
      mime,
      size,
      data: req.body,
      createdAt: Date.now()
    });
    room.filesBytes += size;
    markRoomActivity(room);
    res.json({ fileId, url: `/api/file/${room.id}/${fileId}` });
  }
);

app.get("/api/file/:roomId/:fileId", (req, res) => {
  const room = getRoom(String(req.params.roomId || ""));
  if (!room) {
    res.status(404).end();
    return;
  }
  pruneExpiredRoomFiles(room);
  const fileId = String(req.params.fileId || "");
  const file = room.files.get(fileId);
  if (!file) {
    res.status(404).end();
    return;
  }
  res.setHeader("Content-Type", file.mime || "application/octet-stream");
  res.setHeader("Content-Length", file.size);
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(file.name)}"`
  );
  markRoomActivity(room);
  res.send(file.data);
});

const send = (ws, payload) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
};

const broadcast = (room, payload, exceptId = null) => {
  room.clients.forEach((client) => {
    if (client.id !== exceptId) {
      send(client.ws, payload);
    }
  });
};

const globalMessages = [];
const globalClients = new Map();

const pushGlobalMessage = (message) => {
  globalMessages.push(message);
  if (globalMessages.length > MAX_GLOBAL_CHAT_HISTORY) {
    globalMessages.splice(0, globalMessages.length - MAX_GLOBAL_CHAT_HISTORY);
  }
};

const broadcastGlobal = (payload) => {
  globalClients.forEach((_, clientWs) => {
    send(clientWs, payload);
  });
};
wss.on("connection", (ws) => {
  let currentRoom = null;
  let clientId = null;
  const globalClientId = `g-${createToken(8).slice(0, 12)}`;
  let globalName = "Гость";

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "error", message: "Некорректный формат сообщения" });
      return;
    }

    if (msg.type === "global-subscribe") {
      globalName = normalizeDisplayName(msg.name);
      globalClients.set(ws, { id: globalClientId, name: globalName });
      send(ws, {
        type: "global-history",
        messages: globalMessages.slice(-MAX_GLOBAL_CHAT_HISTORY)
      });
      return;
    }

    if (msg.type === "global-name") {
      globalName = normalizeDisplayName(msg.name);
      if (globalClients.has(ws)) {
        globalClients.set(ws, { id: globalClientId, name: globalName });
      }
      return;
    }

    if (msg.type === "global-chat") {
      const text = String(msg.text || "").trim().slice(0, MAX_CHAT_LENGTH);
      if (!text) {
        return;
      }
      if (!globalClients.has(ws)) {
        globalClients.set(ws, { id: globalClientId, name: globalName });
      }
      const participant = currentRoom && clientId ? currentRoom.clients.get(clientId) : null;
      const senderName = participant?.name || globalName;
      const payload = {
        type: "global-chat",
        from: participant?.id || globalClientId,
        name: senderName,
        text,
        roomId: currentRoom?.id || "",
        roomName: currentRoom?.name || "",
        ts: Date.now()
      };
      pushGlobalMessage(payload);
      broadcastGlobal(payload);
      return;
    }

    if (msg.type === "join") {
      const roomId = String(msg.roomId || "");
      const key = String(msg.key || "");
      const nameRaw = String(msg.name || "").trim();
      const colorRaw = String(msg.color || "").trim();
      const shapeRaw = String(msg.shape || "").trim();

      const room = getRoom(roomId);
      if (!room || room.key !== key) {
        send(ws, { type: "error", message: "Комната не найдена или ключ неверен" });
        ws.close();
        return;
      }

      const baseName = nameRaw.slice(0, MAX_NAME_LENGTH) || "Гость";
      const safeName = getUniqueName(room, baseName);
      clientId = createToken(8).slice(0, 12);
      const participant = {
        id: clientId,
        name: safeName,
        muted: false,
        active: false,
        color: colorRaw || "",
        shape: shapeRaw || "",
        ws
      };
      globalName = participant.name;
      if (globalClients.has(ws)) {
        globalClients.set(ws, { id: globalClientId, name: globalName });
      }

      room.clients.set(clientId, participant);
      currentRoom = room;
      markRoomActivity(room);

      send(ws, {
        type: "welcome",
        clientId,
        roomId: room.id,
        participants: listParticipants(room),
        messages: room.messages,
        globalMessages: globalMessages.slice(-MAX_GLOBAL_CHAT_HISTORY)
      });

      broadcast(
        room,
        {
          type: "participant-joined",
          participant: {
            id: clientId,
            name: safeName,
            muted: false,
            active: false,
            color: participant.color,
            shape: participant.shape
          }
        },
        clientId
      );
      return;
    }

    if (!currentRoom || !clientId) {
      send(ws, { type: "error", message: "Сначала подключитесь к комнате" });
      return;
    }

    if (msg.type === "signal") {
      const to = String(msg.to || "");
      const target = currentRoom.clients.get(to);
      if (target) {
        send(target.ws, {
          type: "signal",
          from: clientId,
          data: msg.data
        });
      }
      return;
    }

    if (msg.type === "name") {
      const participant = currentRoom.clients.get(clientId);
      if (participant) {
        const nextName = String(msg.name || "").trim().slice(0, MAX_NAME_LENGTH) || "Гость";
        if (
          normalizeName(participant.name) !== normalizeName(nextName) &&
          isNameTaken(currentRoom, nextName, clientId)
        ) {
          send(ws, { type: "name-error", message: "Имя уже занято" });
          return;
        }
        participant.name = nextName;
        globalName = participant.name;
        if (globalClients.has(ws)) {
          globalClients.set(ws, { id: globalClientId, name: globalName });
        }
        broadcast(currentRoom, {
          type: "participant-updated",
          id: clientId,
          patch: { name: participant.name }
        });
      }
      return;
    }

    if (msg.type === "mute") {
      const participant = currentRoom.clients.get(clientId);
      if (participant) {
        participant.muted = Boolean(msg.muted);
        broadcast(currentRoom, {
          type: "participant-updated",
          id: clientId,
          patch: { muted: participant.muted }
        });
      }
      return;
    }

    if (msg.type === "color") {
      const participant = currentRoom.clients.get(clientId);
      if (participant) {
        const color = String(msg.color || "").trim();
        if (color) {
          participant.color = color;
          broadcast(currentRoom, {
            type: "participant-updated",
            id: clientId,
            patch: { color: participant.color }
          });
        }
      }
      return;
    }

    if (msg.type === "avatar") {
      const participant = currentRoom.clients.get(clientId);
      if (participant) {
        const shape = String(msg.shape || "").trim();
        if (shape) {
          participant.shape = shape;
          broadcast(currentRoom, {
            type: "participant-updated",
            id: clientId,
            patch: { shape: participant.shape }
          });
        }
      }
      return;
    }

    if (msg.type === "chat") {
      const participant = currentRoom.clients.get(clientId);
      if (participant) {
        const text = String(msg.text || "").trim().slice(0, MAX_CHAT_LENGTH);
        if (text) {
          const payload = {
            type: "chat",
            from: clientId,
            name: participant.name,
            text,
            ts: Date.now()
          };
          pushRoomMessage(currentRoom, payload);
          broadcast(currentRoom, payload);
        }
      }
      return;
    }

    if (msg.type === "file") {
      const participant = currentRoom.clients.get(clientId);
      const file = msg.file || {};
      if (participant) {
        const name = String(file.name || "").trim().slice(0, MAX_FILE_NAME) || "file";
        const size = Number(file.size || 0);
        const mime = String(file.mime || "").trim();
        const dataUrl = typeof file.dataUrl === "string" ? file.dataUrl : "";
        const fileId = String(file.fileId || "");
        const url = String(file.url || "");
        const textPreview =
          typeof file.textPreview === "string" ? file.textPreview.slice(0, 2000) : "";
        const isImage = Boolean(file.isImage);
        if (url && fileId) {
          pruneExpiredRoomFiles(currentRoom);
          const stored = currentRoom.files.get(fileId);
          if (!stored || !Number.isFinite(stored.size) || stored.size <= 0) {
            send(ws, { type: "file-error", message: "Файл не найден" });
            return;
          }
          const payload = {
            type: "file",
            from: clientId,
            name: participant.name,
            file: {
              name: stored.name || name,
              size: stored.size,
              mime: stored.mime || mime,
              url,
              fileId,
              textPreview,
              isImage
            },
            ts: Date.now()
          };
          pushRoomMessage(currentRoom, payload);
          broadcast(currentRoom, payload);
          return;
        }
        if (!dataUrl || !Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE) {
          send(ws, { type: "file-error", message: "Файл не принят" });
          return;
        }
        const payload = {
          type: "file",
          from: clientId,
          name: participant.name,
          file: { name, size, mime, dataUrl, textPreview, isImage },
          ts: Date.now()
        };
        pushRoomMessage(currentRoom, payload);
        broadcast(currentRoom, payload);
      }
      return;
    }

    if (msg.type === "demo-start") {
      const participant = currentRoom.clients.get(clientId);
      if (participant) {
        const sourceId = String(msg.sourceId || "").slice(0, 120);
        const kind = String(msg.kind || "").slice(0, 24);
        const trackId = String(msg.trackId || "").slice(0, 120);
        const label = String(msg.label || "").slice(0, 120);
        broadcast(
          currentRoom,
          {
            type: "demo-start",
            from: clientId,
            sourceId,
            kind,
            trackId,
            label
          },
          clientId
        );
      }
      return;
    }

    if (msg.type === "demo-stop") {
      const participant = currentRoom.clients.get(clientId);
      if (participant) {
        const sourceId = String(msg.sourceId || "").slice(0, 120);
        const kind = String(msg.kind || "").slice(0, 24);
        const trackId = String(msg.trackId || "").slice(0, 120);
        const label = String(msg.label || "").slice(0, 120);
        broadcast(
          currentRoom,
          {
            type: "demo-stop",
            from: clientId,
            sourceId,
            kind,
            trackId,
            label
          },
          clientId
        );
      }
      return;
    }

    if (msg.type === "activity") {
      const participant = currentRoom.clients.get(clientId);
      if (participant) {
        const nextActive = Boolean(msg.active);
        if (participant.active !== nextActive) {
          participant.active = nextActive;
          broadcast(currentRoom, {
            type: "participant-updated",
            id: clientId,
            patch: { active: participant.active }
          });
        }
      }
      return;
    }

  });

  ws.on("close", () => {
    globalClients.delete(ws);
    if (!currentRoom || !clientId) {
      return;
    }
    currentRoom.clients.delete(clientId);
    broadcast(currentRoom, { type: "participant-left", id: clientId });
    if (currentRoom.clients.size === 0) {
      currentRoom.files.clear();
      currentRoom.filesBytes = 0;
    }
    markRoomActivity(currentRoom);
  });
});

initPersistence();
const cleanupTimer = setInterval(cleanupRooms, CLEANUP_INTERVAL_MS);
if (typeof cleanupTimer.unref === "function") {
  cleanupTimer.unref();
}

server.listen(port, () => {
  process.stdout.write(`Server running on http://localhost:${port}\n`);
});
