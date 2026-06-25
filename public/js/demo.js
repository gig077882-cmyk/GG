/**
 * Demo source registry and stage controls.
 * @module demo
 */

import { state, STORAGE_KEYS, DEMO_COMPACT_WINDOW } from "./state.js";
import { log } from "./logger.js";
import { readStorage, writeStorage } from "./storage.js";
import { appendChatMessage } from "./chat.js";
import {
  demoModal, demoModalContent, demoStage, demoVideo, demoLoader, demoLoupe,
  demoUserSelect, demoZoomIndicator, demoStatus, demoSourcePrevButton,
  demoSourceNextButton, demoZoomOutButton, demoZoomInButton, demoFitButton,
  demoResetViewButton, demoFullscreenButton, demoShareToggleButton,
  updateModalOverlayState
} from "./dom.js";

/**
 * Registered demo sources keyed by source id.
 * @type {Map<string, object>}
 */
export const demoSources = new Map();

/**
 * Mutable state for the demo stage transform.
 * @type {object}
 */
export const demoState = {
  scale: 1,
  minScale: 0.5,
  maxScale: 4,
  step: 0.1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  originX: 0,
  originY: 0,
  loupeTimer: null,
  viewMode: "fit",
  stagePointerId: null,
  sourceId: null
};

/**
 * Canvas used for the demo loupe.
 * @type {HTMLCanvasElement}
 */
const demoCanvas = document.createElement("canvas");

/**
 * 2D context for the demo loupe canvas.
 * @type {CanvasRenderingContext2D|null}
 */
const demoCanvasCtx = demoCanvas.getContext("2d");

/**
 * Format a zoom level as a percentage label.
 * @param {number} value - Zoom multiplier.
 * @returns {string} Formatted label.
 */
const formatZoomLabel = (value) => `${Math.round(value * 100)}%`;

/**
 * Return an array of registered demo source ids.
 * @returns {string[]} Source ids.
 */
export const getDemoSourceIds = () => Array.from(demoSources.keys());

/**
 * Set the demo view mode and optionally persist it.
 * @param {"fit"|"manual"} mode - View mode.
 * @param {object} [options={}] - Options.
 * @param {boolean} [options.persist=true] - Persist to storage.
 * @returns {void}
 */
export const setDemoViewMode = (mode, options = {}) => {
  const { persist = true } = options;
  demoState.viewMode = mode === "fit" ? "fit" : "manual";
  if (persist) {
    writeStorage(STORAGE_KEYS.demoViewMode, demoState.viewMode);
  }
  if (demoFitButton) {
    demoFitButton.classList.toggle("is-active", demoState.viewMode === "fit");
  }
};

/**
 * Update the demo status text.
 * @returns {void}
 */
export const updateDemoStatus = () => {
  if (!demoStatus) {
    return;
  }
  const source = demoState.sourceId ? demoSources.get(demoState.sourceId) : null;
  if (!source) {
    demoStatus.textContent = "Нет активной демонстрации экрана";
    return;
  }
  const modeLabel = demoState.viewMode === "fit" ? "по размеру" : "ручной";
  const shareLabel = source.isLocal ? "ваш показ" : "просмотр";
  demoStatus.textContent = `${source.label} | ${shareLabel} | ${modeLabel}`;
};

/**
 * Refresh enabled/disabled states of the demo controls.
 * @returns {void}
 */
export const updateDemoControlState = () => {
  const ids = getDemoSourceIds();
  const hasSources = ids.length > 0;
  const multipleSources = ids.length > 1;
  if (demoStage) {
    demoStage.classList.toggle("is-empty", !hasSources);
  }
  if (demoSourcePrevButton) {
    demoSourcePrevButton.disabled = !multipleSources;
  }
  if (demoSourceNextButton) {
    demoSourceNextButton.disabled = !multipleSources;
  }
  if (demoZoomOutButton) {
    demoZoomOutButton.disabled = !hasSources;
  }
  if (demoZoomInButton) {
    demoZoomInButton.disabled = !hasSources;
  }
  if (demoFitButton) {
    demoFitButton.disabled = !hasSources;
    demoFitButton.classList.toggle("is-active", demoState.viewMode === "fit");
  }
  if (demoResetViewButton) {
    demoResetViewButton.disabled = !hasSources;
  }
  if (demoFullscreenButton) {
    demoFullscreenButton.disabled = !hasSources;
    const activeFullscreen = isDemoFullscreen();
    demoFullscreenButton.textContent = activeFullscreen ? "Выйти из полноэкранного" : "На весь экран";
  }
  if (demoShareToggleButton) {
    demoShareToggleButton.disabled = !state.ws || state.ws.readyState !== WebSocket.OPEN;
    const screenCount = getLocalVideoSourceCount("screen");
    demoShareToggleButton.textContent = screenCount > 0 ? "Stop shares (" + screenCount + ")" : "Start share";
  }
  updateDemoStatus();
};

/**
 * Apply the current scale/offset transform to the demo video.
 * @returns {void}
 */
export const updateDemoTransform = () => {
  if (!demoVideo) {
    return;
  }
  if (DEMO_COMPACT_WINDOW) {
    demoVideo.style.transform = "";
    demoState.scale = 1;
    demoState.offsetX = 0;
    demoState.offsetY = 0;
    setDemoViewMode("fit");
  } else {
    demoVideo.style.transform = `translate(${demoState.offsetX}px, ${demoState.offsetY}px) scale(${demoState.scale})`;
    if (demoZoomIndicator) {
      demoZoomIndicator.textContent = formatZoomLabel(demoState.scale);
    }
    writeStorage(STORAGE_KEYS.demoZoom, String(demoState.scale));
    writeStorage(STORAGE_KEYS.demoOffsetX, String(demoState.offsetX));
    writeStorage(STORAGE_KEYS.demoOffsetY, String(demoState.offsetY));
    writeStorage(STORAGE_KEYS.demoViewMode, demoState.viewMode);
  }
  updateDemoStatus();
};

/**
 * Set the demo zoom scale.
 * @param {number} nextScale - Desired scale.
 * @param {object} [options={}] - Options.
 * @param {boolean} [options.fromUser=true] - Whether the change came from the user.
 * @returns {void}
 */
export const setDemoScale = (nextScale, options = {}) => {
  if (DEMO_COMPACT_WINDOW) {
    return;
  }
  const { fromUser = true } = options;
  const clamped = Math.max(demoState.minScale, Math.min(demoState.maxScale, nextScale));
  const rounded = Math.round(clamped * 10) / 10;
  demoState.scale = rounded;
  if (fromUser) {
    setDemoViewMode("manual");
  }
  updateDemoTransform();
};

/**
 * Nudge the demo view by a relative offset.
 * @param {number} dx - Horizontal offset.
 * @param {number} dy - Vertical offset.
 * @returns {void}
 */
export const nudgeDemo = (dx, dy) => {
  if (DEMO_COMPACT_WINDOW) {
    return;
  }
  demoState.offsetX += dx;
  demoState.offsetY += dy;
  setDemoViewMode("manual");
  updateDemoTransform();
};

/**
 * Show a magnifying loupe near the cursor.
 * @param {number} clientX - Cursor X coordinate.
 * @param {number} clientY - Cursor Y coordinate.
 * @returns {void}
 */
export const showDemoLoupe = (clientX, clientY) => {
  if (!demoLoupe || !demoStage || !demoVideo || !demoCanvasCtx) {
    return;
  }
  if (demoVideo.readyState < 2) {
    return;
  }
  const rect = demoStage.getBoundingClientRect();
  const loupeSize = 140;
  const x = Math.min(rect.width - loupeSize, Math.max(0, clientX - rect.left - loupeSize / 2));
  const y = Math.min(rect.height - loupeSize, Math.max(0, clientY - rect.top - loupeSize / 2));
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const loupeScale = Math.min(demoState.scale * 1.6, demoState.maxScale * 1.6);
  demoCanvas.width = demoVideo.videoWidth;
  demoCanvas.height = demoVideo.videoHeight;
  demoCanvasCtx.drawImage(demoVideo, 0, 0, demoCanvas.width, demoCanvas.height);
  demoLoupe.style.left = `${x}px`;
  demoLoupe.style.top = `${y}px`;
  demoLoupe.style.backgroundImage = `url("${demoCanvas.toDataURL("image/png")}")`;
  demoLoupe.style.backgroundSize = `${demoVideo.videoWidth * loupeScale}px ${demoVideo.videoHeight * loupeScale}px`;
  demoLoupe.style.backgroundPosition = `${-localX * loupeScale + loupeSize / 2}px ${-localY * loupeScale + loupeSize / 2}px`;
  demoLoupe.classList.add("active");
  if (demoState.loupeTimer) {
    clearTimeout(demoState.loupeTimer);
  }
  demoState.loupeTimer = setTimeout(() => {
    demoLoupe.classList.remove("active");
  }, 600);
};

/**
 * Return the owner id for local sources.
 * @returns {string} Owner id.
 */
export const getLocalOwnerId = () => state.clientId || "local";

/**
 * Return local video sources of a given kind.
 * @param {"camera"|"screen"} kind - Source kind.
 * @returns {object[]} Matching sources.
 */
export const getLocalVideoSourcesByKind = (kind) =>
  Array.from(state.localVideoSources.values()).filter((source) => source.kind === kind);

/**
 * Count local video sources of a given kind.
 * @param {"camera"|"screen"} kind - Source kind.
 * @returns {number} Source count.
 */
export const getLocalVideoSourceCount = (kind) => getLocalVideoSourcesByKind(kind).length;

/**
 * Allocate a unique id for a local video source.
 * @param {"camera"|"screen"} kind - Source kind.
 * @returns {string} Unique source id.
 */
export const allocateLocalVideoSourceId = (kind) => {
  state.videoSourceSeq += 1;
  return `${getLocalOwnerId()}:${kind}:${state.videoSourceSeq}`;
};

/**
 * Build a label for a local video source.
 * @param {"camera"|"screen"} kind - Source kind.
 * @param {number} index - Source index.
 * @returns {string} Label.
 */
export const composeLocalVideoLabel = (kind, index) =>
  `${state.name} (you) - ${kind === "screen" ? "screen" : "camera"} ${index}`;

/**
 * Build a label for a remote video track.
 * @param {string} name - Participant name.
 * @param {"camera"|"screen"} kind - Track kind.
 * @param {string} [trackLabel=""] - Track label.
 * @returns {string} Label.
 */
export const composeRemoteVideoLabel = (name, kind, trackLabel = "") => {
  const base = String(name || "Guest");
  const trackText = String(trackLabel || "").trim();
  if (trackText) {
    return `${base} - ${trackText}`;
  }
  return `${base} - ${kind === "screen" ? "screen" : "camera"}`;
};

/**
 * Remove all demo sources belonging to a given owner.
 * @param {string} ownerId - Owner id.
 * @param {object} [options={}] - Options.
 * @param {boolean} [options.announce=false] - Announce removal in chat.
 * @returns {void}
 */
export const removeDemoSourcesByOwner = (ownerId, options = {}) => {
  const ids = [];
  demoSources.forEach((source, id) => {
    if (source?.ownerId === ownerId) {
      ids.push(id);
    }
  });
  ids.forEach((id) => removeDemoSource(id, options));
};

/**
 * Show the demo placeholder and clear the current video source.
 * @param {string} [text="Нет активной демонстрации экрана"] - Placeholder text.
 * @returns {void}
 */
export const showDemoPlaceholder = (text = "Нет активной демонстрации экрана") => {
  if (demoVideo) {
    demoVideo.srcObject = null;
  }
  if (demoState.sourceId && !demoSources.has(demoState.sourceId)) {
    demoState.sourceId = null;
  }
  if (!demoState.sourceId) {
    writeStorage(STORAGE_KEYS.demoSourceId, "");
  }
  if (!demoLoader) {
    updateDemoControlState();
    return;
  }
  demoLoader.classList.remove("hidden");
  demoLoader.innerHTML = `<div>${text}</div>`;
  updateDemoControlState();
};

/**
 * Repopulate the demo source select element.
 * @returns {void}
 */
export const updateDemoSelect = () => {
  if (!demoUserSelect) {
    updateDemoControlState();
    return;
  }
  const activeId = demoState.sourceId;
  demoUserSelect.innerHTML = "";
  if (demoSources.size === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Нет источников";
    demoUserSelect.appendChild(option);
    demoUserSelect.disabled = true;
    updateDemoControlState();
    return;
  }
  demoUserSelect.disabled = false;
  demoSources.forEach((source, id) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = source.label;
    demoUserSelect.appendChild(option);
  });
  if (activeId && demoSources.has(activeId)) {
    demoUserSelect.value = activeId;
  } else {
    demoUserSelect.value = demoSources.keys().next().value;
  }
  updateDemoControlState();
};

/**
 * Announce a demo start in the room chat.
 * @param {string} label - Source label.
 * @returns {void}
 */
export const announceDemoStart = (label) => {
  appendChatMessage({
    name: "Система",
    text: `${label} начал демонстрацию`,
    ts: Date.now()
  });
};

/**
 * Announce a demo stop in the room chat.
 * @param {string} label - Source label.
 * @returns {void}
 */
export const announceDemoStop = (label) => {
  appendChatMessage({
    name: "Система",
    text: `${label} завершил демонстрацию`,
    ts: Date.now()
  });
};

/**
 * Remove a demo source and select a fallback if needed.
 * @param {string} sourceId - Source id.
 * @param {object} [options={}] - Options.
 * @param {boolean} [options.announce=false] - Announce removal in chat.
 * @returns {void}
 */
export const removeDemoSource = (sourceId, options = {}) => {
  const { announce = false } = options;
  if (!demoSources.has(sourceId)) {
    return;
  }
  const source = demoSources.get(sourceId);
  demoSources.delete(sourceId);
  if (announce && source?.label) {
    announceDemoStop(source.label);
  }
  updateDemoSelect();
  if (demoState.sourceId !== sourceId) {
    return;
  }
  demoState.sourceId = null;
  const fallback = demoSources.keys().next().value;
  if (fallback) {
    setDemoImageSource(fallback);
  } else {
    showDemoPlaceholder();
  }
};

/**
 * Decide whether adding a source should auto-select it.
 * @param {string} sourceId - Source id.
 * @param {string} autoSelect - Selection strategy.
 * @returns {boolean} Whether to auto-select.
 */
const shouldAutoSelectDemoSource = (sourceId, autoSelect) => {
  if (autoSelect === "always") {
    return true;
  }
  if (autoSelect === "if-empty-or-current") {
    return !demoState.sourceId || demoState.sourceId === sourceId;
  }
  if (autoSelect === "if-empty") {
    return !demoState.sourceId;
  }
  if (autoSelect === "if-current") {
    return demoState.sourceId === sourceId;
  }
  return !demoState.sourceId || demoState.sourceId === sourceId;
};

/**
 * Add or update a demo source.
 * @param {string} sourceId - Source id.
 * @param {object} payload - Source data.
 * @param {object} [options={}] - Options.
 * @param {string} [options.autoSelect="none"] - Auto-select strategy.
 * @param {boolean} [options.announce=false] - Announce addition in chat.
 * @returns {void}
 */
export const upsertDemoSource = (sourceId, payload, options = {}) => {
  const { autoSelect = "none", announce = false } = options;
  const prev = demoSources.get(sourceId);
  const next = { ...prev, ...payload };
  demoSources.set(sourceId, next);
  updateDemoSelect();
  if (announce && !prev) {
    announceDemoStart(next.label || "Гость");
  }
  if (shouldAutoSelectDemoSource(sourceId, autoSelect)) {
    setDemoImageSource(sourceId);
  }
};

/**
 * Fit the demo video to the available stage area.
 * @param {object} [options={}] - Options.
 * @param {boolean} [options.persistMode=true] - Persist view mode.
 * @returns {void}
 */
export const fitDemoToViewport = (options = {}) => {
  const { persistMode = true } = options;
  if (!demoStage || !demoVideo || demoVideo.videoWidth <= 0 || demoVideo.videoHeight <= 0) {
    return;
  }
  const rect = demoStage.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }
  const scale = Math.min(rect.width / demoVideo.videoWidth, rect.height / demoVideo.videoHeight);
  const rounded = Math.round(scale * 100) / 100;
  demoState.scale = Math.max(demoState.minScale, Math.min(demoState.maxScale, rounded));
  demoState.offsetX = 0;
  demoState.offsetY = 0;
  setDemoViewMode("fit", { persist: persistMode });
  updateDemoTransform();
};

/**
 * Reset the demo view to default zoom and offset.
 * @returns {void}
 */
export const resetDemoView = () => {
  demoState.scale = 1;
  demoState.offsetX = 0;
  demoState.offsetY = 0;
  setDemoViewMode("manual");
  updateDemoTransform();
};

/**
 * Select the next or previous demo source.
 * @param {number} delta - Direction (1 or -1).
 * @returns {void}
 */
export const selectDemoSourceByStep = (delta) => {
  const ids = getDemoSourceIds();
  if (ids.length <= 1) {
    return;
  }
  const currentIndex = Math.max(0, ids.indexOf(demoState.sourceId));
  const nextIndex = (currentIndex + delta + ids.length) % ids.length;
  const nextId = ids[nextIndex];
  setDemoImageSource(nextId);
  demoStage?.focus();
};

/**
 * Check whether the demo modal is currently fullscreen.
 * @returns {boolean} True if fullscreen.
 */
export const isDemoFullscreen = () => {
  const element = document.fullscreenElement;
  if (!element) {
    return false;
  }
  return (
    element === demoModalContent ||
    element === demoStage ||
    Boolean(demoModalContent && demoModalContent.contains(element))
  );
};

/**
 * Toggle fullscreen for the demo modal.
 * @returns {Promise<void>}
 */
export const toggleDemoFullscreen = async () => {
  const target = demoModalContent || demoStage;
  if (!target) {
    return;
  }
  try {
    if (isDemoFullscreen()) {
      await document.exitFullscreen();
    } else {
      await target.requestFullscreen();
    }
  } catch {}
  updateDemoControlState();
};

/**
 * Switch the active demo video source.
 * @param {string} sourceId - Source id.
 * @returns {void}
 */
export const setDemoImageSource = (sourceId) => {
  if (!demoVideo) {
    return;
  }
  const source = demoSources.get(sourceId);
  if (!source?.stream) {
    demoState.sourceId = null;
    writeStorage(STORAGE_KEYS.demoSourceId, "");
    showDemoPlaceholder();
    return;
  }
  demoState.sourceId = sourceId;
  writeStorage(STORAGE_KEYS.demoSourceId, sourceId);
  if (demoUserSelect) {
    demoUserSelect.value = sourceId;
  }
  if (demoLoader) {
    demoLoader.classList.remove("hidden");
    const label = source.label ? String(source.label) : "источник";
    demoLoader.innerHTML = `<div class="demo-spinner"></div><div>Загрузка: ${label}</div>`;
  }
  demoVideo.onloadeddata = () => {
    demoLoader?.classList.add("hidden");
    if (DEMO_COMPACT_WINDOW) {
      updateDemoTransform();
    } else if (demoState.viewMode === "fit") {
      fitDemoToViewport({ persistMode: false });
    } else {
      updateDemoTransform();
    }
    demoVideo.play().catch(() => {});
    updateDemoControlState();
  };
  demoVideo.onerror = () => {
    showDemoPlaceholder("Не удалось загрузить поток");
  };
  demoVideo.srcObject = source.stream;
  updateDemoControlState();
};
