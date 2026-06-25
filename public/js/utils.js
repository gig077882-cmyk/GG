/**
 * Pure utility functions used across the UI.
 * @module utils
 */

/**
 * Clamp an RGB channel value to [0, 255].
 * @param {number} value - Channel value.
 * @returns {number} Clamped value.
 */
export const clampRgb = (value) => Math.min(255, Math.max(0, value));

/**
 * Mix a single color channel toward a target value.
 * @param {number} value - Current channel value.
 * @param {number} target - Target channel value.
 * @param {number} amount - Blend amount in [0, 1].
 * @returns {number} Mixed channel value.
 */
export const mixChannel = (value, target, amount) =>
  Math.round(value * (1 - amount) + target * amount);

/**
 * Convert RGB values to a hex color string.
 * @param {number} r - Red channel.
 * @param {number} g - Green channel.
 * @param {number} b - Blue channel.
 * @returns {string} Hex color like `#RRGGBB`.
 */
export const rgbToHex = (r, g, b) =>
  `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;

/**
 * Parse a hex color string into RGB components.
 * @param {string} value - Hex color (`#RGB` or `#RRGGBB`).
 * @returns {{r: number, g: number, b: number}|null} RGB object or null.
 */
export const parseHexColor = (value) => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("#")) {
    return null;
  }

  if (trimmed.length === 4) {
    const r = parseInt(trimmed[1] + trimmed[1], 16);
    const g = parseInt(trimmed[2] + trimmed[2], 16);
    const b = parseInt(trimmed[3] + trimmed[3], 16);
    if ([r, g, b].some((channel) => Number.isNaN(channel))) {
      return null;
    }
    return { r, g, b };
  }

  if (trimmed.length === 7) {
    const r = parseInt(trimmed.slice(1, 3), 16);
    const g = parseInt(trimmed.slice(3, 5), 16);
    const b = parseInt(trimmed.slice(5, 7), 16);
    if ([r, g, b].some((channel) => Number.isNaN(channel))) {
      return null;
    }
    return { r, g, b };
  }

  return null;
};

/**
 * Parse an `rgb(r, g, b)` string into RGB components.
 * @param {string} value - RGB color string.
 * @returns {{r: number, g: number, b: number}|null} RGB object or null.
 */
export const parseRgbColor = (value) => {
  const match = value
    .trim()
    .match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!match) {
    return null;
  }

  const [r, g, b] = match.slice(1).map((part) => Number(part));
  if ([r, g, b].some((part) => Number.isNaN(part) || part > 255)) {
    return null;
  }
  return { r, g, b };
};

/**
 * Parse a hex or rgb color string.
 * @param {string} value - Color string.
 * @returns {{r: number, g: number, b: number}|null} RGB object or null.
 */
export const parseThemeColor = (value) => parseHexColor(value) || parseRgbColor(value);

/**
 * Format a timestamp as `HH:MM`.
 * @param {number|string|Date} value - Timestamp or date-like value.
 * @returns {string} Time label.
 */
export const formatChatTime = (value) => {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

/**
 * Check whether the active element is an input field.
 * @param {Element} [target=document.activeElement] - Element to check.
 * @returns {boolean} True if the element accepts typing.
 */
export const isTypingTarget = (target = document.activeElement) =>
  target instanceof HTMLElement &&
  target.matches("input, textarea, select, [contenteditable='true']");

/**
 * Format a byte size as human-readable text.
 * @param {number} size - Size in bytes.
 * @returns {string} Formatted size.
 */
export const formatFileSize = (size) => {
  if (!Number.isFinite(size)) {
    return "";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 102.4) / 10} KB`;
  }
  return `${Math.round(size / (1024 * 102.4)) / 10} MB`;
};

/**
 * Normalize a file name, falling back to "file".
 * @param {string} name - Raw file name.
 * @returns {string} Normalized name.
 */
export const normalizeFilename = (name) => {
  const trimmed = String(name || "").trim();
  return trimmed || "file";
};

/**
 * Extract the lower-case file extension from a name.
 * @param {string} name - File name.
 * @returns {string} Extension without dot, or empty string.
 */
export const getFileExtension = (name) => {
  const safeName = normalizeFilename(name);
  const index = safeName.lastIndexOf(".");
  return index !== -1 ? safeName.slice(index + 1).toLowerCase() : "";
};

/**
 * Determine whether a file should be previewed as text.
 * @param {File} file - File object.
 * @returns {boolean} True for text-like files.
 */
export const isTextFile = (file) => {
  if (file?.type?.startsWith("text/")) {
    return true;
  }

  const ext = getFileExtension(file?.name || "");
  return [
    "js",
    "ts",
    "json",
    "md",
    "txt",
    "html",
    "css",
    "py",
    "java",
    "cpp",
    "c",
    "h",
    "go",
    "rs",
    "yml",
    "yaml",
    "xml",
    "sh",
    "sql"
  ].includes(ext);
};

/**
 * Determine whether a file is an image.
 * @param {File} file - File object.
 * @returns {boolean} True for image files.
 */
export const isImageFile = (file) => file?.type?.startsWith("image/");

/**
 * Clamp a text preview to a maximum length.
 * @param {string} value - Text content.
 * @returns {string} Clamped text.
 */
export const clampTextPreview = (value) => {
  if (!value) {
    return "";
  }
  if (value.length <= 1200) {
    return value;
  }
  return `${value.slice(0, 1200)}…`;
};

/**
 * Hash a string into a numeric value for deterministic avatars.
 * @param {string} value - Input string.
 * @returns {number} Positive hash value.
 */
export const hashString = (value) => {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

/**
 * Parse the URL hash into room parameters.
 * @returns {{roomId: string, key: string}} Parsed hash data.
 */
export const parseHash = () => {
  const params = new URLSearchParams(location.hash.replace(/^#/, ""));
  return {
    roomId: String(params.get("room") || "").trim(),
    key: String(params.get("key") || "").trim()
  };
};

/**
 * Convert a media error into a short user-facing message.
 * @param {Error|null} error - Caught media error.
 * @param {string} fallback - Fallback message.
 * @returns {string} Short error description.
 */
export const formatMediaError = (error, fallback) => {
  if (!error) {
    return fallback;
  }
  const name = error.name ? String(error.name) : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "access denied";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "device not found";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "device is busy";
  }
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return "unsupported constraints";
  }
  if (name === "AbortError") {
    return "operation aborted";
  }
  return fallback;
};

/**
 * Parse a stored numeric value from localStorage.
 * @param {string} value - Raw stored value.
 * @returns {number|null} Parsed number or null.
 */
export const parseStoredNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
