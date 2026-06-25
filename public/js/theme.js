/**
 * Avatar shape and theme color constants/helpers.
 * @module theme
 */

import { STORAGE_KEYS } from "./state.js";
import { readStorage, writeStorage } from "./storage.js";

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

/**
 * Available theme modes.
 * @type {string[]}
 */
export const THEME_MODES = ["auto", "dark", "light"];

/**
 * Resolved theme mode labels.
 * @type {Record<string, string>}
 */
export const THEME_MODE_LABELS = {
  auto: "A",
  dark: "D",
  light: "L"
};

const darkPalette = {
  textColor: "#cccccc",
  bgColor: "#0c0c0c",
  panelColor: "#000000",
  borderColor: "#333333"
};

const lightPalette = {
  textColor: "#111111",
  bgColor: "#f4f4f4",
  panelColor: "#ffffff",
  borderColor: "#cccccc"
};

let currentThemeMode = "auto";

/**
 * Resolve auto mode to a concrete light/dark value.
 * @returns {"light"|"dark"} Resolved value.
 */
export const resolveAutoThemeMode = () =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

/**
 * Get the active theme mode (without resolving auto).
 * @returns {string} Current mode.
 */
export const getThemeMode = () => currentThemeMode;

/**
 * Set CSS variables for the selected base palette.
 * @param {"auto"|"dark"|"light"} mode - Theme mode.
 * @returns {void}
 */
export const applyThemeMode = (mode) => {
  currentThemeMode = THEME_MODES.includes(mode) ? mode : "auto";
  const resolved = currentThemeMode === "auto" ? resolveAutoThemeMode() : currentThemeMode;
  const palette = resolved === "light" ? lightPalette : darkPalette;
  document.documentElement.style.setProperty("--text-color", palette.textColor);
  document.documentElement.style.setProperty("--bg-color", palette.bgColor);
  document.documentElement.style.setProperty("--panel-color", palette.panelColor);
  document.documentElement.style.setProperty("--border-color", palette.borderColor);
  document.documentElement.setAttribute("data-theme-mode", currentThemeMode);
};

/**
 * Persist and apply the theme mode.
 * @param {"auto"|"dark"|"light"} mode - Theme mode.
 * @returns {void}
 */
export const setThemeMode = (mode) => {
  applyThemeMode(mode);
  writeStorage(STORAGE_KEYS.themeMode, currentThemeMode);
};

/**
 * Cycle to the next theme mode.
 * @returns {string} The new mode.
 */
export const cycleThemeMode = () => {
  const index = THEME_MODES.indexOf(currentThemeMode);
  const next = THEME_MODES[(index + 1) % THEME_MODES.length];
  setThemeMode(next);
  return next;
};

/**
 * Update a theme toggle button text to reflect the current mode.
 * @param {HTMLElement|null} button - Toggle button.
 * @returns {void}
 */
export const updateThemeToggleButton = (button) => {
  if (!button) {
    return;
  }
  const label = THEME_MODE_LABELS[currentThemeMode] || "A";
  button.textContent = label;
  button.setAttribute("aria-label", `Theme: ${currentThemeMode}`);
};

/**
 * Read the stored theme mode if any.
 * @returns {string} Stored mode or "auto".
 */
export const readStoredThemeMode = () => {
  const stored = readStorage(STORAGE_KEYS.themeMode);
  return THEME_MODES.includes(stored) ? stored : "auto";
};

/**
 * Listen for system color scheme changes when in auto mode.
 * @returns {void}
 */
export const initAutoThemeListener = () => {
  const media = window.matchMedia("(prefers-color-scheme: light)");
  media.addEventListener("change", () => {
    if (currentThemeMode === "auto") {
      applyThemeMode("auto");
    }
  });
};
