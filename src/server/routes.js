/**
 * Express HTTP routes.
 * @module routes
 */

const path = require("path");
const express = require("express");
const { ROOT_DIR, MAX_FILE_SIZE_MB } = require("./config");
const {
  MAX_FILE_SIZE,
  MAX_FILE_NAME,
  MAX_ROOM_NAME
} = require("./constants");
const {
  createRoom,
  createToken,
  getRoom,
  roomsByName,
  normalizeName,
  pruneExpiredRoomFiles,
  ensureRoomFileCapacity,
  markRoomActivity
} = require("./rooms");
const { buildIceServers } = require("./ice");
const { persistRoom, persistRoomActivity } = require("./persistence");

/**
 * Absolute path to the public static assets folder.
 * @type {string}
 */
const PUBLIC_PATH = path.join(ROOT_DIR, "public");

/**
 * Absolute path to the rnnoise vendor bundle.
 * @type {string}
 */
const RNNOISE_PATH = path.join(
  ROOT_DIR,
  "node_modules",
  "@jitsi",
  "rnnoise-wasm",
  "dist",
  "rnnoise-sync.js"
);

/**
 * Wire all HTTP routes onto an Express application.
 * @param {import("express").Application} app - Express app instance.
 * @returns {void}
 */
const setupRoutes = (app) => {
  app.use(express.json());
  app.use(express.static(PUBLIC_PATH));

  app.get("/vendor/rnnoise-sync.js", (req, res) => {
    res.sendFile(RNNOISE_PATH);
  });

  app.get("/api/create", (req, res) => {
    let name = String(req.query.name || "").trim();
    if (name) {
      name = name.slice(0, MAX_ROOM_NAME);
      const normalized = normalizeName(name);
      if (roomsByName.has(normalized)) {
        res.status(409).json({ error: "Комната с таким названием уже существует" });
        return;
      }
    }

    const room = createRoom(name);
    persistRoom(room);

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
      persistRoomActivity(roomId);

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
    persistRoomActivity(room.id);
    res.send(file.data);
  });
};

module.exports = {
  setupRoutes
};
