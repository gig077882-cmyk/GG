/**
 * HTTP API wrappers.
 * @module api
 */

import { state } from "./state.js";
import { DEFAULT_ICE_SERVERS } from "./state.js";

/**
 * Cached promise for fetching ICE servers.
 * @type {Promise<RTCIceServer[]>|null}
 */
let iceServersPromise = null;

/**
 * Fetch ICE server configuration from the backend.
 * Falls back to public STUN if the request fails.
 * @returns {Promise<RTCIceServer[]>} ICE servers.
 */
export const ensureIceServers = async () => {
  if (state.iceServers && state.iceServers.length) {
    return state.iceServers;
  }

  if (!iceServersPromise) {
    iceServersPromise = fetch("/api/ice")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.iceServers?.length) {
          state.iceServers = data.iceServers;
        } else {
          state.iceServers = DEFAULT_ICE_SERVERS;
        }
        return state.iceServers;
      })
      .catch(() => {
        state.iceServers = DEFAULT_ICE_SERVERS;
        return state.iceServers;
      });
  }

  return iceServersPromise;
};

/**
 * Create a new room via the backend API.
 * @param {string} [name=""] - Optional room name.
 * @returns {Promise<{roomId: string, key: string, joinUrl: string, name: string}>} Room data.
 */
export const fetchCreateRoom = async (name) => {
  const url = new URL("/api/create", location.origin);
  if (name) {
    url.searchParams.set("name", name);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    if (res.status === 409) {
      throw new Error("ROOM_NAME_TAKEN");
    }
    throw new Error("CREATE_FAILED");
  }
  return res.json();
};

/**
 * Resolve a room name to a room id.
 * @param {string} name - Room name.
 * @returns {Promise<string>} Room id.
 */
export const resolveRoomName = async (name) => {
  const trimmed = String(name || "").trim();
  const url = new URL("/api/resolve", location.origin);
  url.searchParams.set("name", trimmed);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error("RESOLVE_FAILED");
  }
  const data = await res.json();
  return data.roomId;
};

/**
 * Check whether a string looks like a room id (8 base64url chars).
 * @param {string} value - Input string.
 * @returns {boolean} True if it resembles a room id.
 */
export const looksLikeRoomId = (value) => /^[A-Za-z0-9_-]{8}$/.test(String(value || "").trim());
