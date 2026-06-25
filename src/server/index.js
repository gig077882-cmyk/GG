/**
 * Server bootstrap.
 * @module server/index
 */

const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");

const { PORT, CLEANUP_INTERVAL_MS } = require("./config");
const { setupRoutes } = require("./routes");
const { setupSignaling } = require("./signaling");
const { cleanupRooms } = require("./rooms");
const { initPersistence } = require("./persistence");

/**
 * Express application instance.
 * @type {import("express").Application}
 */
const app = express();

/**
 * HTTP server instance.
 * @type {import("http").Server}
 */
const server = http.createServer(app);

/**
 * WebSocket server instance.
 * @type {import("ws").WebSocketServer}
 */
const wss = new WebSocketServer({ server });

setupRoutes(app);
setupSignaling(wss);
initPersistence();

const cleanupTimer = setInterval(cleanupRooms, CLEANUP_INTERVAL_MS);
if (typeof cleanupTimer.unref === "function") {
  cleanupTimer.unref();
}

server.listen(PORT, () => {
  process.stdout.write(`Server running on http://localhost:${PORT}\n`);
});
