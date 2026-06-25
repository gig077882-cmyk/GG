/**
 * WebSocket signaling and global chat handling.
 * @module signaling
 */

const {
  MAX_CHAT_LENGTH,
  MAX_GLOBAL_CHAT_HISTORY,
  MAX_FILE_NAME,
  MAX_FILE_SIZE
} = require("./constants");
const {
  getRoom,
  listParticipants,
  pushRoomMessage,
  markRoomActivity,
  pruneExpiredRoomFiles,
  createToken
} = require("./rooms");
const { getUniqueName, normalizeDisplayName } = require("./participants");
const { persistRoomActivity, persistMessage } = require("./persistence");

/**
 * In-memory global chat history.
 * @type {object[]}
 */
const globalMessages = [];

/**
 * Connected global-chat clients.
 * @type {Map<WebSocket, {id: string, name: string}>}
 */
const globalClients = new Map();

/**
 * Send a JSON payload to a single WebSocket.
 * @param {WebSocket} ws - Target socket.
 * @param {object} payload - Message payload.
 * @returns {void}
 */
const send = (ws, payload) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
};

/**
 * Broadcast a payload to all clients in a room except one.
 * @param {Room} room - Target room.
 * @param {object} payload - Message payload.
 * @param {string} [exceptId=null] - Participant id to skip.
 * @returns {void}
 */
const broadcast = (room, payload, exceptId = null) => {
  room.clients.forEach((client) => {
    if (client.id !== exceptId) {
      send(client.ws, payload);
    }
  });
};

/**
 * Append a message to global chat history.
 * @param {object} message - Global chat message.
 * @returns {void}
 */
const pushGlobalMessage = (message) => {
  globalMessages.push(message);
  if (globalMessages.length > MAX_GLOBAL_CHAT_HISTORY) {
    globalMessages.splice(0, globalMessages.length - MAX_GLOBAL_CHAT_HISTORY);
  }
};

/**
 * Broadcast a payload to all global-chat subscribers.
 * @param {object} payload - Message payload.
 * @returns {void}
 */
const broadcastGlobal = (payload) => {
  globalClients.forEach((_, clientWs) => {
    send(clientWs, payload);
  });
};

/**
 * Handle a `join` message.
 * @param {WebSocket} ws - Client socket.
 * @param {object} state - Mutable connection state.
 * @param {object} msg - Parsed join message.
 * @returns {void}
 */
const handleJoin = (ws, state, msg) => {
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

  const baseName = nameRaw.slice(0, 24) || "Гость";
  const safeName = getUniqueName(room, baseName);
  const clientId = createToken(8).slice(0, 12);
  const participant = {
    id: clientId,
    name: safeName,
    muted: false,
    active: false,
    color: colorRaw || "",
    shape: shapeRaw || "",
    ws
  };

  state.clientId = clientId;
  state.globalName = participant.name;
  if (globalClients.has(ws)) {
    globalClients.set(ws, { id: state.globalClientId, name: state.globalName });
  }

  room.clients.set(clientId, participant);
  state.currentRoom = room;
  markRoomActivity(room);
  persistRoomActivity(room.id);

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
};

/**
 * Handle a `signal` WebRTC signaling message.
 * @param {WebSocket} ws - Client socket.
 * @param {object} state - Mutable connection state.
 * @param {object} msg - Parsed signal message.
 * @returns {void}
 */
const handleSignal = (ws, state, msg) => {
  const { currentRoom, clientId } = state;
  if (!currentRoom || !clientId) {
    send(ws, { type: "error", message: "Сначала подключитесь к комнате" });
    return;
  }

  const to = String(msg.to || "");
  const target = currentRoom.clients.get(to);
  if (target) {
    send(target.ws, {
      type: "signal",
      from: clientId,
      data: msg.data
    });
  }
};

/**
 * Handle a `name` change message.
 * @param {WebSocket} ws - Client socket.
 * @param {object} state - Mutable connection state.
 * @param {object} msg - Parsed name message.
 * @returns {void}
 */
const handleName = (ws, state, msg) => {
  const { currentRoom, clientId } = state;
  if (!currentRoom || !clientId) {
    return;
  }

  const participant = currentRoom.clients.get(clientId);
  if (!participant) {
    return;
  }

  const { isNameTaken } = require("./participants");
  const nextName = String(msg.name || "").trim().slice(0, 24) || "Гость";
  if (
    participant.name !== nextName &&
    isNameTaken(currentRoom, nextName, clientId)
  ) {
    send(ws, { type: "name-error", message: "Имя уже занято" });
    return;
  }

  participant.name = nextName;
  state.globalName = participant.name;
  if (globalClients.has(ws)) {
    globalClients.set(ws, { id: state.globalClientId, name: state.globalName });
  }

  broadcast(currentRoom, {
    type: "participant-updated",
    id: clientId,
    patch: { name: participant.name }
  });
};

/**
 * Handle a `mute` state change.
 * @param {WebSocket} ws - Client socket.
 * @param {object} state - Mutable connection state.
 * @param {object} msg - Parsed mute message.
 * @returns {void}
 */
const handleMute = (ws, state, msg) => {
  const { currentRoom, clientId } = state;
  if (!currentRoom || !clientId) {
    return;
  }

  const participant = currentRoom.clients.get(clientId);
  if (participant) {
    participant.muted = Boolean(msg.muted);
    broadcast(currentRoom, {
      type: "participant-updated",
      id: clientId,
      patch: { muted: participant.muted }
    });
  }
};

/**
 * Handle a `color` theme change.
 * @param {WebSocket} ws - Client socket.
 * @param {object} state - Mutable connection state.
 * @param {object} msg - Parsed color message.
 * @returns {void}
 */
const handleColor = (ws, state, msg) => {
  const { currentRoom, clientId } = state;
  if (!currentRoom || !clientId) {
    return;
  }

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
};

/**
 * Handle an `avatar` shape change.
 * @param {WebSocket} ws - Client socket.
 * @param {object} state - Mutable connection state.
 * @param {object} msg - Parsed avatar message.
 * @returns {void}
 */
const handleAvatar = (ws, state, msg) => {
  const { currentRoom, clientId } = state;
  if (!currentRoom || !clientId) {
    return;
  }

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
};

/**
 * Handle a `chat` message.
 * @param {WebSocket} ws - Client socket.
 * @param {object} state - Mutable connection state.
 * @param {object} msg - Parsed chat message.
 * @returns {void}
 */
const handleChat = (ws, state, msg) => {
  const { currentRoom, clientId } = state;
  if (!currentRoom || !clientId) {
    return;
  }

  const participant = currentRoom.clients.get(clientId);
  if (!participant) {
    return;
  }

  const text = String(msg.text || "").trim().slice(0, MAX_CHAT_LENGTH);
  if (!text) {
    return;
  }

  const payload = {
    type: "chat",
    from: clientId,
    name: participant.name,
    text,
    ts: Date.now()
  };
  pushRoomMessage(currentRoom, payload);
  persistMessage(currentRoom.id, payload);
  broadcast(currentRoom, payload);
};

/**
 * Handle a `file` message.
 * @param {WebSocket} ws - Client socket.
 * @param {object} state - Mutable connection state.
 * @param {object} msg - Parsed file message.
 * @returns {void}
 */
const handleFile = (ws, state, msg) => {
  const { currentRoom, clientId } = state;
  if (!currentRoom || !clientId) {
    return;
  }

  const participant = currentRoom.clients.get(clientId);
  if (!participant) {
    return;
  }

  const file = msg.file || {};
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
    persistMessage(currentRoom.id, payload);
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
  persistMessage(currentRoom.id, payload);
  broadcast(currentRoom, payload);
};

/**
 * Handle a `demo-start` message.
 * @param {WebSocket} ws - Client socket.
 * @param {object} state - Mutable connection state.
 * @param {object} msg - Parsed demo-start message.
 * @returns {void}
 */
const handleDemoStart = (ws, state, msg) => {
  const { currentRoom, clientId } = state;
  if (!currentRoom || !clientId) {
    return;
  }

  const participant = currentRoom.clients.get(clientId);
  if (participant) {
    broadcast(
      currentRoom,
      {
        type: "demo-start",
        from: clientId,
        sourceId: String(msg.sourceId || "").slice(0, 120),
        kind: String(msg.kind || "").slice(0, 24),
        trackId: String(msg.trackId || "").slice(0, 120),
        label: String(msg.label || "").slice(0, 120)
      },
      clientId
    );
  }
};

/**
 * Handle a `demo-stop` message.
 * @param {WebSocket} ws - Client socket.
 * @param {object} state - Mutable connection state.
 * @param {object} msg - Parsed demo-stop message.
 * @returns {void}
 */
const handleDemoStop = (ws, state, msg) => {
  const { currentRoom, clientId } = state;
  if (!currentRoom || !clientId) {
    return;
  }

  const participant = currentRoom.clients.get(clientId);
  if (participant) {
    broadcast(
      currentRoom,
      {
        type: "demo-stop",
        from: clientId,
        sourceId: String(msg.sourceId || "").slice(0, 120),
        kind: String(msg.kind || "").slice(0, 24),
        trackId: String(msg.trackId || "").slice(0, 120),
        label: String(msg.label || "").slice(0, 120)
      },
      clientId
    );
  }
};

/**
 * Handle an `activity` status change.
 * @param {WebSocket} ws - Client socket.
 * @param {object} state - Mutable connection state.
 * @param {object} msg - Parsed activity message.
 * @returns {void}
 */
const handleActivity = (ws, state, msg) => {
  const { currentRoom, clientId } = state;
  if (!currentRoom || !clientId) {
    return;
  }

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
};

/**
 * Handle global chat subscription.
 * @param {WebSocket} ws - Client socket.
 * @param {object} state - Mutable connection state.
 * @param {object} msg - Parsed global-subscribe message.
 * @returns {void}
 */
const handleGlobalSubscribe = (ws, state, msg) => {
  state.globalName = normalizeDisplayName(msg.name);
  globalClients.set(ws, { id: state.globalClientId, name: state.globalName });
  send(ws, {
    type: "global-history",
    messages: globalMessages.slice(-MAX_GLOBAL_CHAT_HISTORY)
  });
};

/**
 * Handle a global name change.
 * @param {WebSocket} ws - Client socket.
 * @param {object} state - Mutable connection state.
 * @param {object} msg - Parsed global-name message.
 * @returns {void}
 */
const handleGlobalName = (ws, state, msg) => {
  state.globalName = normalizeDisplayName(msg.name);
  if (globalClients.has(ws)) {
    globalClients.set(ws, { id: state.globalClientId, name: state.globalName });
  }
};

/**
 * Handle a global chat message.
 * @param {WebSocket} ws - Client socket.
 * @param {object} state - Mutable connection state.
 * @param {object} msg - Parsed global-chat message.
 * @returns {void}
 */
const handleGlobalChat = (ws, state, msg) => {
  const text = String(msg.text || "").trim().slice(0, MAX_CHAT_LENGTH);
  if (!text) {
    return;
  }

  if (!globalClients.has(ws)) {
    globalClients.set(ws, { id: state.globalClientId, name: state.globalName });
  }

  const participant = state.currentRoom && state.clientId
    ? state.currentRoom.clients.get(state.clientId)
    : null;
  const senderName = participant?.name || state.globalName;

  const payload = {
    type: "global-chat",
    from: participant?.id || state.globalClientId,
    name: senderName,
    text,
    roomId: state.currentRoom?.id || "",
    roomName: state.currentRoom?.name || "",
    ts: Date.now()
  };

  pushGlobalMessage(payload);
  broadcastGlobal(payload);
};

/**
 * Map of message type handlers.
 * @type {Record<string, Function>}
 */
const HANDLERS = {
  join: handleJoin,
  signal: handleSignal,
  name: handleName,
  mute: handleMute,
  color: handleColor,
  avatar: handleAvatar,
  chat: handleChat,
  file: handleFile,
  "demo-start": handleDemoStart,
  "demo-stop": handleDemoStop,
  activity: handleActivity,
  "global-subscribe": handleGlobalSubscribe,
  "global-name": handleGlobalName,
  "global-chat": handleGlobalChat
};

/**
 * Handle an incoming WebSocket message.
 * @param {WebSocket} ws - Client socket.
 * @param {object} state - Mutable connection state.
 * @param {Buffer} raw - Raw message data.
 * @returns {void}
 */
const onMessage = (ws, state, raw) => {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    send(ws, { type: "error", message: "Некорректный формат сообщения" });
    return;
  }

  const handler = HANDLERS[msg.type];
  if (handler) {
    handler(ws, state, msg);
  }
};

/**
 * Handle a WebSocket disconnect.
 * @param {WebSocket} ws - Client socket.
 * @param {object} state - Mutable connection state.
 * @returns {void}
 */
const onClose = (ws, state) => {
  globalClients.delete(ws);

  if (!state.currentRoom || !state.clientId) {
    return;
  }

  state.currentRoom.clients.delete(state.clientId);
  broadcast(state.currentRoom, { type: "participant-left", id: state.clientId });
  if (state.currentRoom.clients.size === 0) {
    state.currentRoom.files.clear();
    state.currentRoom.filesBytes = 0;
  }
  markRoomActivity(state.currentRoom);
  persistRoomActivity(state.currentRoom.id);
};

/**
 * Attach signaling handlers to a WebSocket server.
 * @param {import("ws").WebSocketServer} wss - WebSocket server instance.
 * @returns {void}
 */
const setupSignaling = (wss) => {
  wss.on("connection", (ws) => {
    const state = {
      currentRoom: null,
      clientId: null,
      globalClientId: `g-${createToken(8).slice(0, 12)}`,
      globalName: "Гость"
    };

    ws.on("message", (raw) => onMessage(ws, state, raw));
    ws.on("close", () => onClose(ws, state));
  });
};

module.exports = {
  setupSignaling,
  send,
  broadcast
};
