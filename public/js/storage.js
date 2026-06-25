/**
 * Safe localStorage helpers.
 * @module storage
 */

/**
 * Read a value from localStorage.
 * @param {string} key - Storage key.
 * @returns {string|null} Stored value or null.
 */
export const readStorage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * Write a value to localStorage.
 * @param {string} key - Storage key.
 * @param {string} value - Value to store.
 * @returns {void}
 */
export const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors (e.g., private mode or quota exceeded).
  }
};
