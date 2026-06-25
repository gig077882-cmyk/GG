/**
 * Avatar shape and theme color constants/helpers.
 * @module theme
 */

/**
 * Mapping from avatar shape keys to CSS class names.
 * @type {Record<string, string>}
 */
export const avatarShapeOptions = {
  auto: "",
  square: "shape-square",
  circle: "shape-circle",
  diamond: "shape-diamond",
  hex: "shape-hex",
  triangle: "shape-triangle"
};

/**
 * Normalize an avatar shape value to a known key.
 * @param {string} value - Raw shape value.
 * @returns {string|null} Normalized key or null.
 */
export const normalizeAvatarShape = (value) => {
  const key = String(value || "").trim().toLowerCase();
  if (!key) {
    return null;
  }
  return Object.prototype.hasOwnProperty.call(avatarShapeOptions, key) ? key : null;
};
