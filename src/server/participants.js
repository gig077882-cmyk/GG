/**
 * Participant name helpers and uniqueness checks.
 * @module participants
 */

const { MAX_NAME_LENGTH } = require("./constants");
const { normalizeName } = require("./rooms");

/**
 * Check whether a name is already taken in a room.
 * @param {Room} room - Target room.
 * @param {string} name - Name to check.
 * @param {string} [exceptId=null] - Optional participant id to exclude.
 * @returns {boolean} True if the name is taken.
 */
const isNameTaken = (room, name, exceptId = null) => {
  const target = normalizeName(name);
  for (const client of room.clients.values()) {
    if (client.id !== exceptId && normalizeName(client.name) === target) {
      return true;
    }
  }
  return false;
};

/**
 * Generate a unique display name in a room.
 * @param {Room} room - Target room.
 * @param {string} baseName - Preferred base name.
 * @param {string} [exceptId=null] - Optional participant id to exclude.
 * @returns {string} Unique display name.
 */
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

/**
 * Sanitize a display name.
 * @param {string} value - Raw name.
 * @returns {string} Safe display name.
 */
const normalizeDisplayName = (value) =>
  String(value || "").trim().slice(0, MAX_NAME_LENGTH) || "Гость";

module.exports = {
  isNameTaken,
  getUniqueName,
  normalizeDisplayName
};
