/**
 * Console log output.
 * @module logger
 */

import { logEl } from "./dom.js";
import { state, isMobileCallMode } from "./state.js";
import { setMobileConsoleUnread } from "./mobile.js";

/**
 * Append a line to the console log and scroll to the bottom.
 * @param {string} text - Message text.
 * @returns {void}
 */
export const log = (text) => {
  if (!logEl) {
    return;
  }
  const line = document.createElement("div");
  line.textContent = text;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
  if (isMobileCallMode && state.mobileTab !== "console") {
    setMobileConsoleUnread(true);
  }
};
