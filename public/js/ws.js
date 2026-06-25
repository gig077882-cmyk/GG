/**
 * Low-level WebSocket send helpers.
 * @module ws
 */

import { state } from "./state.js";

/**
 * Send a JSON message to the active room WebSocket.
 * @param {object} payload - Message payload.
 * @returns {void}
 */
export const sendMessage = (payload) => {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(payload));
  }
};

/**
 * Build the WebSocket URL for the current host.
 * @returns {string} ws:// or wss:// URL.
 */
export const getWsUrl = () => {
  const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
  return `${wsProtocol}://${location.host}`;
};

/**
 * Send a JSON message to the global chat WebSocket.
 * @param {object} payload - Message payload.
 * @returns {boolean} True if the message was sent.
 */
export const sendGlobalSocketMessage = (payload) => {
  if (state.globalWs && state.globalWs.readyState === WebSocket.OPEN) {
    state.globalWs.send(JSON.stringify(payload));
    return true;
  }
  return false;
};
