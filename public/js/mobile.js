/**
 * Mobile UI behavior: tabs, swipe navigation and keyboard state.
 * @module mobile
 */

import {
  mobileChatTabButton, mobileConsoleTabButton, mobileTabButtons,
  mobileTabPanes, mobilePanelsRoot, mobileChatInput, cmdInput
} from "./dom.js";
import { isMobileCallMode, state, STORAGE_KEYS, MOBILE_TAB_ORDER, pageParams } from "./state.js";
import { readStorage, writeStorage } from "./storage.js";

/**
 * Toggle the unread indicator on the chat tab.
 * @param {boolean} unread - Whether there are unread messages.
 * @returns {void}
 */
export const setMobileChatUnread = (unread) => {
  state.mobileChatUnread = unread;
  if (mobileChatTabButton) {
    mobileChatTabButton.classList.toggle("has-unread", unread);
  }
};

/**
 * Toggle the unread indicator on the console tab.
 * @param {boolean} unread - Whether there are unread console messages.
 * @returns {void}
 */
export const setMobileConsoleUnread = (unread) => {
  state.mobileConsoleUnread = unread;
  if (mobileConsoleTabButton) {
    mobileConsoleTabButton.classList.toggle("has-unread", unread);
  }
};

/**
 * Update the body class when a text field is focused.
 * @returns {void}
 */
export const updateMobileKeyboardState = () => {
  if (!isMobileCallMode) {
    return;
  }
  const active = document.activeElement;
  const focusedField =
    active instanceof HTMLElement &&
    (active.matches("input, textarea, [contenteditable='true']") || active === cmdInput);
  document.body.classList.toggle("mobile-keyboard-open", focusedField);
};

/**
 * Switch mobile tab by a relative offset.
 * @param {number} delta - Number of tabs to move.
 * @returns {void}
 */
const switchMobileTabByDelta = (delta) => {
  if (!isMobileCallMode) {
    return;
  }
  const index = MOBILE_TAB_ORDER.indexOf(state.mobileTab);
  const current = index === -1 ? 0 : index;
  const next = Math.min(MOBILE_TAB_ORDER.length - 1, Math.max(0, current + delta));
  if (next !== current) {
    setMobileTab(MOBILE_TAB_ORDER[next]);
  }
};

/**
 * Activate a mobile tab by name.
 * @param {string} nextTab - Tab name.
 * @returns {void}
 */
export const setMobileTab = (nextTab) => {
  if (!isMobileCallMode || !mobileTabButtons.length || !mobileTabPanes.length) {
    return;
  }
  const targetTab = String(nextTab || "room");
  const exists = mobileTabButtons.some((button) => button.dataset.mobileTabBtn === targetTab);
  const safeTab = exists ? targetTab : "room";
  state.mobileTab = safeTab;
  writeStorage(STORAGE_KEYS.mobileTab, safeTab);
  mobileTabButtons.forEach((button) => {
    const active = button.dataset.mobileTabBtn === safeTab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  mobileTabPanes.forEach((pane) => {
    const active = pane.dataset.mobileTabPane === safeTab;
    pane.classList.toggle("is-active", active);
    pane.toggleAttribute("hidden", !active);
  });
  if (safeTab === "chat") {
    setMobileChatUnread(false);
  } else if (safeTab === "console") {
    setMobileConsoleUnread(false);
  }
};

/**
 * Wire mobile tab buttons and swipe navigation.
 * @returns {void}
 */
export const initMobileTabs = () => {
  if (!isMobileCallMode || !mobileTabButtons.length || !mobileTabPanes.length) {
    return;
  }
  mobileTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setMobileTab(button.dataset.mobileTabBtn || "room");
    });
  });

  if (mobilePanelsRoot) {
    let swipePointerId = null;
    let swipeStartX = 0;
    let swipeStartY = 0;

    mobilePanelsRoot.addEventListener("pointerdown", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (target.closest("input, textarea, button, select, a, [contenteditable='true']")) {
        return;
      }
      swipePointerId = event.pointerId;
      swipeStartX = event.clientX;
      swipeStartY = event.clientY;
    });

    const clearSwipe = () => {
      swipePointerId = null;
    };

    mobilePanelsRoot.addEventListener("pointerup", (event) => {
      if (swipePointerId !== event.pointerId) {
        return;
      }
      const dx = event.clientX - swipeStartX;
      const dy = event.clientY - swipeStartY;
      clearSwipe();
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.2) {
        return;
      }
      switchMobileTabByDelta(dx < 0 ? 1 : -1);
    });

    mobilePanelsRoot.addEventListener("pointercancel", clearSwipe);
  }

  const requestedTab = pageParams.get("tab");
  const storedTab = readStorage(STORAGE_KEYS.mobileTab);
  setMobileTab(requestedTab || storedTab || "room");
};

/**
 * Initialize focus-based mobile keyboard/tab behavior.
 * @returns {void}
 */
export const initMobileInputState = () => {
  if (!isMobileCallMode) {
    return;
  }
  document.addEventListener("focusin", () => {
    const active = document.activeElement;
    if (active === mobileChatInput) {
      setMobileTab("chat");
    } else if (active === cmdInput) {
      setMobileTab("console");
    }
    updateMobileKeyboardState();
  });
  document.addEventListener("focusout", () => {
    requestAnimationFrame(updateMobileKeyboardState);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateMobileKeyboardState);
  }
  updateMobileKeyboardState();
};
