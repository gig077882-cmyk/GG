import {
  statusEl, roomIdEl, roomLinkEl, copyLinkButton,
  chatLogEl, chatPanelEl, chatToggleButton, chatFileInput, chatFileButton,
  mobileChatForm, mobileChatInput, mobileChatFileButton,
  cmdForm, cmdInput, cmdArrow, cmdMenu, muteButton, noiseButton, cameraButton,
  cameraSwitchButton, leaveButton, helpButton, themeModal, themeColorInput,
  themeTextInput, themeApplyButton, themeCancelButton, themeError,
  globalChatModal, globalChatForm, globalChatInput,
  globalChatCloseButton, globalChatToggleButton,
  demoButton, demoModal, demoModalContent, demoHeader, demoStage,
  demoVideo, demoLoader, demoLoupe, demoResizeHandle, demoClose,
  demoZoomIndicator, demoUserSelect, demoStatus, demoSourcePrevButton,
  demoSourceNextButton, demoZoomOutButton, demoZoomInButton, demoFitButton,
  demoResetViewButton, demoFullscreenButton, demoShareToggleButton,
  policyModal, policyAcceptButton, cameraPreview,
  cameraPreviewHandle, cameraPreviewVideo, cameraPreviewResize,
  updateModalOverlayState
} from "./dom.js";
import { readStorage, writeStorage } from "./storage.js";
import {
  state, isMobileCallMode, DEMO_COMPACT_WINDOW,
  STORAGE_KEYS, DEFAULT_ICE_SERVERS,
  GLOBAL_CHAT_RETRY_MS
} from "./state.js";
import {
  clearOfferRetry, clearAllOfferRetries, shouldCreateOffer, sendOfferToPeer, handleSignal
} from "./webrtc.js";
import {
  clampRgb, mixChannel, rgbToHex, parseThemeColor,
  isTypingTarget,
  parseHash, formatMediaError, parseStoredNumber
} from "./utils.js";
import { ensureIceServers, fetchCreateRoom, resolveRoomName, looksLikeRoomId } from "./api.js";
import { log } from "./logger.js";
import {
  setMobileChatUnread, setMobileConsoleUnread, setMobileTab,
  initMobileTabs, initMobileInputState, updateMobileKeyboardState
} from "./mobile.js";
import {
  closeCommandMenu, openCommandMenu, getCommandToken,
  commandInputHasArgs, commandSuggestState,
  selectCommandSuggestion, renderCommandMenu, resetCommandSuggestState,
  refreshCommandSuggestions
} from "./commands.js";
import {
  appendChatMessage, renderChatHistory,
  appendGlobalChatMessage, renderGlobalChatHistory,
  setChatHidden, toggleChatHidden, openChatFilePicker,
  updateChatFileButton, updateMobileChatControls, sendFileMessage, sendChatMessage
} from "./chat.js";
import { normalizeAvatarShape } from "./theme.js";
import { renderParticipants, updateLocalParticipant } from "./participants.js";

if (isMobileCallMode) {
  document.body.classList.add("mobile-call-mode");
}

/**
 * Store the current room id/key in the URL hash and update the UI.
 * @param {string} roomId - Room identifier.
 * @param {string} key - Room access key.
 * @returns {void}
 */
const setRoomParams = (roomId, key) => {
  state.roomId = roomId;
  state.key = key;
  location.hash = key ? `room=${roomId}&key=${key}` : `room=${roomId}`;
  updateRoomInfo();
};

const isPolicyAccepted = () => readStorage(STORAGE_KEYS.policyAccepted) === "true";

const openPolicyModal = () => {
  if (!policyModal) {
    return;
  }
  policyModal.classList.add("open");
  policyModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("policy-locked");
  updateModalOverlayState();
};

const closePolicyModal = () => {
  if (!policyModal) {
    return;
  }
  policyModal.classList.remove("open");
  policyModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("policy-locked");
  updateModalOverlayState();
};

const ensurePolicyAccepted = () => {
  if (isPolicyAccepted()) {
    return;
  }
  openPolicyModal();
};

if (isMobileCallMode) {
  state.chatHidden = false;
}

// ============================================================
// Chat and global chat UI
// ============================================================

// ============================================================
// Global chat modal
// ============================================================

const openGlobalChatModal = () => {
  if (!globalChatModal) {
    return;
  }
  connectGlobalChatSocket();
  globalChatModal.classList.add("open");
  globalChatModal.setAttribute("aria-hidden", "false");
  updateModalOverlayState();
  if (isMobileCallMode) {
    setMobileTab("chat");
  }
  if (globalChatInput) {
    globalChatInput.focus();
  }
};

const closeGlobalChatModal = () => {
  if (!globalChatModal) {
    return;
  }
  globalChatModal.classList.remove("open");
  globalChatModal.setAttribute("aria-hidden", "true");
  updateModalOverlayState();
};

const toggleGlobalChatModal = () => {
  if (!globalChatModal) {
    return;
  }
  if (globalChatModal.classList.contains("open")) {
    closeGlobalChatModal();
  } else {
    openGlobalChatModal();
  }
};

const sendGlobalChatMessage = (text) => {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return false;
  }
  if (!sendGlobalSocketMessage({ type: "global-chat", text: trimmed })) {
    connectGlobalChatSocket();
    log("Global chat reconnecting...");
    return false;
  }
  return true;
};

// ============================================================
// Status and UI helpers
// ============================================================

const setStatus = (text) => {
  statusEl.textContent = text;
};

const demoSources = new Map();

const setTextColor = (r, g, b) => {
  const red = clampRgb(r);
  const green = clampRgb(g);
  const blue = clampRgb(b);
  const nextColor = `rgb(${red}, ${green}, ${blue})`;
  state.textColor = nextColor;
  const background = `rgb(${mixChannel(red, 0, 0.92)}, ${mixChannel(
    green,
    0,
    0.92
  )}, ${mixChannel(blue, 0, 0.92)})`;
  const panel = `rgb(${mixChannel(red, 0, 0.88)}, ${mixChannel(
    green,
    0,
    0.88
  )}, ${mixChannel(blue, 0, 0.88)})`;
  const border = `rgb(${mixChannel(red, 0, 0.7)}, ${mixChannel(
    green,
    0,
    0.7
  )}, ${mixChannel(blue, 0, 0.7)})`;
  document.documentElement.style.setProperty("--text-color", nextColor);
  document.documentElement.style.setProperty("--accent-color", nextColor);
  document.documentElement.style.setProperty("--bg-color", background);
  document.documentElement.style.setProperty("--panel-color", panel);
  document.documentElement.style.setProperty("--border-color", border);
  writeStorage(STORAGE_KEYS.textColor, nextColor);
  if (state.clientId) {
    updateLocalParticipant({ color: nextColor });
    sendMessage({ type: "color", color: nextColor });
  }
};

const setAvatarShape = (shape) => {
  const normalized = normalizeAvatarShape(shape) || "auto";
  state.avatarShape = normalized;
  writeStorage(STORAGE_KEYS.avatarShape, normalized);
  if (state.clientId) {
    updateLocalParticipant({ shape: normalized });
    sendMessage({ type: "avatar", shape: normalized });
  }
};

const applyStoredSettings = () => {
  const storedName = readStorage(STORAGE_KEYS.name);
  if (storedName) {
    state.name = storedName.slice(0, 24);
  }
  const storedColor = readStorage(STORAGE_KEYS.textColor);
  if (storedColor) {
    const parsed = parseThemeColor(storedColor);
    if (parsed) {
      setTextColor(parsed.r, parsed.g, parsed.b);
    }
  }
  const storedShape = readStorage(STORAGE_KEYS.avatarShape);
  if (storedShape) {
    setAvatarShape(storedShape);
  }
};

// ============================================================
// Theme and appearance
// ============================================================

const openThemeModal = () => {
  if (!themeModal || !themeColorInput || !themeTextInput || !themeError) {
    log("Окно темы недоступно");
    return;
  }
  const parsed = parseThemeColor(state.textColor) || { r: 185, g: 251, b: 192 };
  themeColorInput.value = rgbToHex(parsed.r, parsed.g, parsed.b);
  themeTextInput.value = state.textColor;
  themeError.textContent = "";
  themeModal.classList.add("open");
  themeModal.setAttribute("aria-hidden", "false");
  themeTextInput.focus();
  updateModalOverlayState();
};

const closeThemeModal = () => {
  if (!themeModal) {
    return;
  }
  themeModal.classList.remove("open");
  themeModal.setAttribute("aria-hidden", "true");
  updateModalOverlayState();
};

const applyThemeFromInput = () => {
  if (!themeTextInput || !themeColorInput || !themeError) {
    return;
  }
  const value = themeTextInput.value.trim() || themeColorInput.value;
  const parsed = parseThemeColor(value);
  if (!parsed) {
    themeError.textContent =
      "Некорректный цвет. Формат: #RGB, #RRGGBB или rgb(r, g, b).";
    return;
  }
  setTextColor(parsed.r, parsed.g, parsed.b);
  closeThemeModal();
};

const demoState = {
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

const demoWindowState = {
  x: null,
  y: null,
  width: null,
  height: null,
  minWidth: 240,
  minHeight: 160,
  maxWidth: 960,
  dragPointerId: null,
  dragStartX: 0,
  dragStartY: 0,
  dragOriginX: 0,
  dragOriginY: 0,
  resizePointerId: null,
  resizeStartX: 0,
  resizeStartY: 0,
  resizeOriginWidth: 0,
  resizeOriginHeight: 0,
  placed: false
};

const cameraPreviewState = {
  dragPointerId: null,
  dragStartX: 0,
  dragStartY: 0,
  dragOriginX: 0,
  dragOriginY: 0,
  resizePointerId: null,
  resizeStartX: 0,
  resizeStartY: 0,
  resizeOriginWidth: 320,
  x: 12,
  y: 12,
  width: 320,
  minWidth: 180,
  maxWidth: 760,
  placed: false
};

// ============================================================
// Camera preview positioning
// ============================================================

const clampCameraPreviewPosition = (x, y) => {
  if (!cameraPreview) {
    return { x, y };
  }
  const margin = 12;
  const width = cameraPreview.offsetWidth || 260;
  const height = cameraPreview.offsetHeight || 180;
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  const maxY = Math.max(margin, window.innerHeight - height - margin);
  return {
    x: Math.min(maxX, Math.max(margin, x)),
    y: Math.min(maxY, Math.max(margin, y))
  };
};

const clampCameraPreviewWidth = (value) => {
  if (!cameraPreview) {
    return value;
  }
  const margin = 12;
  const handleHeight = cameraPreviewHandle?.offsetHeight || 28;
  const maxByX = window.innerWidth - cameraPreviewState.x - margin;
  const maxHeight = window.innerHeight - cameraPreviewState.y - margin;
  const maxByY = ((maxHeight - handleHeight) * 16) / 9;
  const boundedMax = Math.max(
    cameraPreviewState.minWidth,
    Math.min(cameraPreviewState.maxWidth, maxByX, maxByY)
  );
  return Math.min(boundedMax, Math.max(cameraPreviewState.minWidth, value));
};

const applyCameraPreviewSize = () => {
  if (!cameraPreview) {
    return;
  }
  cameraPreview.style.width = `${Math.round(cameraPreviewState.width)}px`;
  if (isMobileCallMode) {
    return;
  }
  writeStorage(STORAGE_KEYS.cameraPreviewWidth, String(Math.round(cameraPreviewState.width)));
};

const applyCameraPreviewPosition = () => {
  if (!cameraPreview) {
    return;
  }
  cameraPreview.style.left = "0";
  cameraPreview.style.top = "0";
  cameraPreview.style.transform = `translate3d(${Math.round(cameraPreviewState.x)}px, ${Math.round(cameraPreviewState.y)}px, 0)`;
  if (isMobileCallMode) {
    return;
  }
  writeStorage(STORAGE_KEYS.cameraPreviewX, String(cameraPreviewState.x));
  writeStorage(STORAGE_KEYS.cameraPreviewY, String(cameraPreviewState.y));
};

const restoreCameraPreviewPosition = () => {
  if (isMobileCallMode) {
    cameraPreviewState.placed = false;
    return;
  }
  const storedX = parseStoredNumber(readStorage(STORAGE_KEYS.cameraPreviewX));
  const storedY = parseStoredNumber(readStorage(STORAGE_KEYS.cameraPreviewY));
  const storedWidth = parseStoredNumber(readStorage(STORAGE_KEYS.cameraPreviewWidth));
  if (storedX === null || storedY === null) {
    cameraPreviewState.placed = false;
  } else {
    cameraPreviewState.x = storedX;
    cameraPreviewState.y = storedY;
    cameraPreviewState.placed = true;
  }
  if (storedWidth !== null) {
    cameraPreviewState.width = storedWidth;
  }
};

const placeCameraPreviewAtCorner = () => {
  if (!cameraPreview) {
    return;
  }
  const margin = 12;
  const width = cameraPreview.offsetWidth || 260;
  const height = cameraPreview.offsetHeight || 180;
  const next = clampCameraPreviewPosition(
    window.innerWidth - width - margin,
    window.innerHeight - height - margin
  );
  cameraPreviewState.x = next.x;
  cameraPreviewState.y = next.y;
  applyCameraPreviewPosition();
};

const showCameraPreview = (stream) => {
  if (!cameraPreview || !cameraPreviewVideo) {
    return;
  }
  cameraPreviewVideo.srcObject = stream;
  cameraPreview.classList.remove("hidden");
  cameraPreview.setAttribute("aria-hidden", "false");
  const boundedWidth = clampCameraPreviewWidth(cameraPreviewState.width);
  cameraPreviewState.width = boundedWidth;
  applyCameraPreviewSize();
  if (!cameraPreviewState.placed) {
    requestAnimationFrame(() => {
      const widthAfterLayout = clampCameraPreviewWidth(cameraPreview.offsetWidth || cameraPreviewState.width);
      cameraPreviewState.width = widthAfterLayout;
      applyCameraPreviewSize();
      placeCameraPreviewAtCorner();
      cameraPreviewState.placed = true;
    });
    return;
  }
  const next = clampCameraPreviewPosition(cameraPreviewState.x, cameraPreviewState.y);
  cameraPreviewState.x = next.x;
  cameraPreviewState.y = next.y;
  applyCameraPreviewPosition();
};

const hideCameraPreview = () => {
  if (!cameraPreview || !cameraPreviewVideo) {
    return;
  }
  if (isCameraPreviewFullscreen()) {
    document.exitFullscreen().catch(() => {});
  }
  cameraPreview.classList.add("hidden");
  cameraPreview.classList.remove("dragging");
  cameraPreview.classList.remove("resizing");
  cameraPreview.setAttribute("aria-hidden", "true");
  cameraPreviewVideo.srcObject = null;
  cameraPreviewState.dragPointerId = null;
  cameraPreviewState.resizePointerId = null;
};

const onCameraPreviewPointerDown = (event) => {
  if (!cameraPreview || !cameraPreviewHandle || cameraPreview.classList.contains("hidden")) {
    return;
  }
  cameraPreviewState.dragPointerId = event.pointerId;
  cameraPreviewState.dragStartX = event.clientX;
  cameraPreviewState.dragStartY = event.clientY;
  cameraPreviewState.dragOriginX = cameraPreviewState.x;
  cameraPreviewState.dragOriginY = cameraPreviewState.y;
  cameraPreview.classList.add("dragging");
  cameraPreviewHandle.setPointerCapture(event.pointerId);
  event.preventDefault();
};

const onCameraPreviewPointerMove = (event) => {
  if (!cameraPreview || cameraPreviewState.dragPointerId !== event.pointerId) {
    return;
  }
  const dx = event.clientX - cameraPreviewState.dragStartX;
  const dy = event.clientY - cameraPreviewState.dragStartY;
  const next = clampCameraPreviewPosition(
    cameraPreviewState.dragOriginX + dx,
    cameraPreviewState.dragOriginY + dy
  );
  cameraPreviewState.x = next.x;
  cameraPreviewState.y = next.y;
  applyCameraPreviewPosition();
  event.preventDefault();
};

const onCameraPreviewPointerUp = (event) => {
  if (
    !cameraPreview ||
    !cameraPreviewHandle ||
    cameraPreviewState.dragPointerId !== event.pointerId
  ) {
    return;
  }
  if (cameraPreviewHandle.hasPointerCapture(event.pointerId)) {
    cameraPreviewHandle.releasePointerCapture(event.pointerId);
  }
  cameraPreviewState.dragPointerId = null;
  cameraPreview.classList.remove("dragging");
};

const onCameraPreviewResizeDown = (event) => {
  if (!cameraPreview || !cameraPreviewResize || cameraPreview.classList.contains("hidden")) {
    return;
  }
  cameraPreviewState.resizePointerId = event.pointerId;
  cameraPreviewState.resizeStartX = event.clientX;
  cameraPreviewState.resizeStartY = event.clientY;
  cameraPreviewState.resizeOriginWidth = cameraPreview.offsetWidth || cameraPreviewState.width;
  cameraPreview.classList.add("resizing");
  cameraPreviewResize.setPointerCapture(event.pointerId);
  event.preventDefault();
};

const onCameraPreviewResizeMove = (event) => {
  if (!cameraPreview || cameraPreviewState.resizePointerId !== event.pointerId) {
    return;
  }
  const dx = event.clientX - cameraPreviewState.resizeStartX;
  const dy = event.clientY - cameraPreviewState.resizeStartY;
  const dyToWidth = (dy * 16) / 9;
  const delta = Math.abs(dx) >= Math.abs(dyToWidth) ? dx : dyToWidth;
  cameraPreviewState.width = clampCameraPreviewWidth(cameraPreviewState.resizeOriginWidth + delta);
  applyCameraPreviewSize();
  const nextPos = clampCameraPreviewPosition(cameraPreviewState.x, cameraPreviewState.y);
  cameraPreviewState.x = nextPos.x;
  cameraPreviewState.y = nextPos.y;
  applyCameraPreviewPosition();
  event.preventDefault();
};

const onCameraPreviewResizeUp = (event) => {
  if (
    !cameraPreview ||
    !cameraPreviewResize ||
    cameraPreviewState.resizePointerId !== event.pointerId
  ) {
    return;
  }
  if (cameraPreviewResize.hasPointerCapture(event.pointerId)) {
    cameraPreviewResize.releasePointerCapture(event.pointerId);
  }
  cameraPreviewState.resizePointerId = null;
  cameraPreview.classList.remove("resizing");
};

const bindCameraPreviewDrag = () => {
  if (!cameraPreview || !cameraPreviewHandle || !cameraPreviewResize) {
    return;
  }
  if (isMobileCallMode) {
    return;
  }
  cameraPreviewHandle.addEventListener("pointerdown", onCameraPreviewPointerDown);
  cameraPreviewHandle.addEventListener("pointermove", onCameraPreviewPointerMove);
  cameraPreviewHandle.addEventListener("pointerup", onCameraPreviewPointerUp);
  cameraPreviewHandle.addEventListener("pointercancel", onCameraPreviewPointerUp);
  cameraPreviewResize.addEventListener("pointerdown", onCameraPreviewResizeDown);
  cameraPreviewResize.addEventListener("pointermove", onCameraPreviewResizeMove);
  cameraPreviewResize.addEventListener("pointerup", onCameraPreviewResizeUp);
  cameraPreviewResize.addEventListener("pointercancel", onCameraPreviewResizeUp);
  window.addEventListener("resize", () => {
    if (cameraPreview.classList.contains("hidden")) {
      return;
    }
    cameraPreviewState.width = clampCameraPreviewWidth(cameraPreviewState.width);
    applyCameraPreviewSize();
    const next = clampCameraPreviewPosition(cameraPreviewState.x, cameraPreviewState.y);
    cameraPreviewState.x = next.x;
    cameraPreviewState.y = next.y;
    applyCameraPreviewPosition();
  });
};

const bindCameraPreviewFullscreen = () => {
  if (!cameraPreview || !cameraPreviewVideo) {
    return;
  }
  const onToggle = (event) => {
    event.preventDefault();
    toggleCameraPreviewFullscreen();
  };
  cameraPreviewVideo.addEventListener("dblclick", onToggle);
  cameraPreviewHandle?.addEventListener("dblclick", onToggle);
};

const clampDemoWindowSize = (width, height) => {
  const margin = 12;
  const maxWidthByViewport = Math.max(demoWindowState.minWidth, window.innerWidth - margin * 2);
  const maxHeightByViewport = Math.max(demoWindowState.minHeight, window.innerHeight - margin * 2);
  if (!DEMO_COMPACT_WINDOW) {
    return {
      width: Math.min(maxWidthByViewport, Math.max(demoWindowState.minWidth, width)),
      height: Math.min(maxHeightByViewport, Math.max(demoWindowState.minHeight, height))
    };
  }
  const headerHeight = demoHeader?.offsetHeight || 28;
  const maxByHeight = Math.max(
    demoWindowState.minWidth,
    ((maxHeightByViewport - headerHeight) * 16) / 9
  );
  const maxWidth = Math.max(
    demoWindowState.minWidth,
    Math.min(demoWindowState.maxWidth, maxWidthByViewport, maxByHeight)
  );
  const clampedWidth = Math.min(maxWidth, Math.max(demoWindowState.minWidth, width));
  const computedHeight = headerHeight + (clampedWidth * 9) / 16;
  return {
    width: clampedWidth,
    height: Math.min(maxHeightByViewport, Math.max(demoWindowState.minHeight, computedHeight))
  };
};

const clampDemoWindowPosition = (x, y, width, height) => {
  const margin = 12;
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  const maxY = Math.max(margin, window.innerHeight - height - margin);
  return {
    x: Math.min(maxX, Math.max(margin, x)),
    y: Math.min(maxY, Math.max(margin, y))
  };
};

const persistDemoWindowRect = () => {
  if (isMobileCallMode) {
    return;
  }
  writeStorage(STORAGE_KEYS.demoWindowX, String(Math.round(demoWindowState.x ?? 0)));
  writeStorage(STORAGE_KEYS.demoWindowY, String(Math.round(demoWindowState.y ?? 0)));
  writeStorage(STORAGE_KEYS.demoWindowW, String(Math.round(demoWindowState.width ?? 0)));
  writeStorage(STORAGE_KEYS.demoWindowH, String(Math.round(demoWindowState.height ?? 0)));
};

const applyDemoWindowRect = () => {
  if (!demoModalContent || isMobileCallMode) {
    return;
  }
  if (demoWindowState.width === null || demoWindowState.height === null) {
    const rect = demoModalContent.getBoundingClientRect();
    demoWindowState.width = Math.max(demoWindowState.minWidth, rect.width || 320);
    demoWindowState.height = Math.max(demoWindowState.minHeight, rect.height || 208);
  }
  const size = clampDemoWindowSize(demoWindowState.width, demoWindowState.height);
  demoWindowState.width = size.width;
  demoWindowState.height = size.height;
  if (demoWindowState.x === null || demoWindowState.y === null) {
    demoWindowState.x = Math.max(12, window.innerWidth - demoWindowState.width - 12);
    demoWindowState.y = Math.max(12, window.innerHeight - demoWindowState.height - 12);
  }
  const pos = clampDemoWindowPosition(
    demoWindowState.x,
    demoWindowState.y,
    demoWindowState.width,
    demoWindowState.height
  );
  demoWindowState.x = pos.x;
  demoWindowState.y = pos.y;
  demoModalContent.style.right = "auto";
  demoModalContent.style.left = "0";
  demoModalContent.style.top = "0";
  demoModalContent.style.width = `${Math.round(demoWindowState.width)}px`;
  demoModalContent.style.height = `${Math.round(demoWindowState.height)}px`;
  demoModalContent.style.transform = `translate3d(${Math.round(demoWindowState.x)}px, ${Math.round(demoWindowState.y)}px, 0)`;
  persistDemoWindowRect();
};

const restoreDemoWindowRect = () => {
  if (isMobileCallMode) {
    demoWindowState.placed = false;
    return;
  }
  const x = parseStoredNumber(readStorage(STORAGE_KEYS.demoWindowX));
  const y = parseStoredNumber(readStorage(STORAGE_KEYS.demoWindowY));
  const w = parseStoredNumber(readStorage(STORAGE_KEYS.demoWindowW));
  const h = parseStoredNumber(readStorage(STORAGE_KEYS.demoWindowH));
  if (w !== null) {
    demoWindowState.width = w;
  }
  if (h !== null) {
    demoWindowState.height = h;
  }
  if (x !== null && y !== null) {
    demoWindowState.x = x;
    demoWindowState.y = y;
    demoWindowState.placed = true;
  } else {
    demoWindowState.placed = false;
  }
};

const placeDemoWindowDefault = () => {
  if (!demoModalContent || isMobileCallMode) {
    return;
  }
  const rect = demoModalContent.getBoundingClientRect();
  const width = rect.width || demoWindowState.width || 320;
  const height = rect.height || demoWindowState.height || 208;
  demoWindowState.width = width;
  demoWindowState.height = height;
  demoWindowState.x = Math.max(12, window.innerWidth - width - 12);
  demoWindowState.y = Math.max(12, window.innerHeight - height - 12);
  demoWindowState.placed = true;
  applyDemoWindowRect();
};

const onDemoHeaderPointerDown = (event) => {
  if (!demoHeader || !demoModalContent || isMobileCallMode) {
    return;
  }
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("button, input, select, textarea, a")) {
    return;
  }
  demoWindowState.dragPointerId = event.pointerId;
  demoWindowState.dragStartX = event.clientX;
  demoWindowState.dragStartY = event.clientY;
  demoWindowState.dragOriginX = demoWindowState.x ?? demoModalContent.getBoundingClientRect().left;
  demoWindowState.dragOriginY = demoWindowState.y ?? demoModalContent.getBoundingClientRect().top;
  demoModalContent.classList.add("is-dragging");
  demoHeader.setPointerCapture(event.pointerId);
  event.preventDefault();
};

const onDemoHeaderPointerMove = (event) => {
  if (
    !demoHeader ||
    !demoModalContent ||
    demoWindowState.dragPointerId !== event.pointerId ||
    isMobileCallMode
  ) {
    return;
  }
  const dx = event.clientX - demoWindowState.dragStartX;
  const dy = event.clientY - demoWindowState.dragStartY;
  demoWindowState.x = demoWindowState.dragOriginX + dx;
  demoWindowState.y = demoWindowState.dragOriginY + dy;
  applyDemoWindowRect();
  event.preventDefault();
};

const onDemoHeaderPointerUp = (event) => {
  if (!demoHeader || !demoModalContent || demoWindowState.dragPointerId !== event.pointerId) {
    return;
  }
  if (demoHeader.hasPointerCapture(event.pointerId)) {
    demoHeader.releasePointerCapture(event.pointerId);
  }
  demoWindowState.dragPointerId = null;
  demoModalContent.classList.remove("is-dragging");
};

const onDemoResizePointerDown = (event) => {
  if (!demoResizeHandle || !demoModalContent || isMobileCallMode) {
    return;
  }
  demoWindowState.resizePointerId = event.pointerId;
  demoWindowState.resizeStartX = event.clientX;
  demoWindowState.resizeStartY = event.clientY;
  const rect = demoModalContent.getBoundingClientRect();
  demoWindowState.resizeOriginWidth = rect.width;
  demoWindowState.resizeOriginHeight = rect.height;
  demoWindowState.width = rect.width;
  demoWindowState.height = rect.height;
  demoModalContent.classList.add("is-resizing");
  demoResizeHandle.setPointerCapture(event.pointerId);
  event.preventDefault();
};

const onDemoResizePointerMove = (event) => {
  if (
    !demoResizeHandle ||
    !demoModalContent ||
    demoWindowState.resizePointerId !== event.pointerId ||
    isMobileCallMode
  ) {
    return;
  }
  const dx = event.clientX - demoWindowState.resizeStartX;
  if (DEMO_COMPACT_WINDOW) {
    const dy = event.clientY - demoWindowState.resizeStartY;
    const dyToWidth = (dy * 16) / 9;
    const delta = Math.abs(dx) >= Math.abs(dyToWidth) ? dx : dyToWidth;
    demoWindowState.width = demoWindowState.resizeOriginWidth + delta;
  } else {
    const dy = event.clientY - demoWindowState.resizeStartY;
    demoWindowState.width = demoWindowState.resizeOriginWidth + dx;
    demoWindowState.height = demoWindowState.resizeOriginHeight + dy;
  }
  applyDemoWindowRect();
  if (demoState.viewMode === "fit" && !DEMO_COMPACT_WINDOW) {
    fitDemoToViewport({ persistMode: false });
  }
  event.preventDefault();
};

const onDemoResizePointerUp = (event) => {
  if (!demoResizeHandle || !demoModalContent || demoWindowState.resizePointerId !== event.pointerId) {
    return;
  }
  if (demoResizeHandle.hasPointerCapture(event.pointerId)) {
    demoResizeHandle.releasePointerCapture(event.pointerId);
  }
  demoWindowState.resizePointerId = null;
  demoModalContent.classList.remove("is-resizing");
};

const bindDemoWindowControls = () => {
  if (!demoModalContent || !demoHeader || !demoResizeHandle || isMobileCallMode) {
    return;
  }
  demoHeader.addEventListener("pointerdown", onDemoHeaderPointerDown);
  demoHeader.addEventListener("pointermove", onDemoHeaderPointerMove);
  demoHeader.addEventListener("pointerup", onDemoHeaderPointerUp);
  demoHeader.addEventListener("pointercancel", onDemoHeaderPointerUp);
  demoResizeHandle.addEventListener("pointerdown", onDemoResizePointerDown);
  demoResizeHandle.addEventListener("pointermove", onDemoResizePointerMove);
  demoResizeHandle.addEventListener("pointerup", onDemoResizePointerUp);
  demoResizeHandle.addEventListener("pointercancel", onDemoResizePointerUp);
};

const bindDemoFullscreenGesture = () => {
  if (!demoHeader) {
    return;
  }
  demoHeader.addEventListener("dblclick", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("button, input, select, textarea, a")) {
      return;
    }
    toggleDemoFullscreen();
  });
};

const formatZoomLabel = (value) => `${Math.round(value * 100)}%`;

const getDemoSourceIds = () => Array.from(demoSources.keys());

const setDemoViewMode = (mode, options = {}) => {
  const { persist = true } = options;
  demoState.viewMode = mode === "fit" ? "fit" : "manual";
  if (persist) {
    writeStorage(STORAGE_KEYS.demoViewMode, demoState.viewMode);
  }
  if (demoFitButton) {
    demoFitButton.classList.toggle("is-active", demoState.viewMode === "fit");
  }
};

const updateDemoStatus = () => {
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

const updateDemoControlState = () => {
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

const updateDemoTransform = () => {
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

const setDemoScale = (nextScale, options = {}) => {
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

const nudgeDemo = (dx, dy) => {
  if (DEMO_COMPACT_WINDOW) {
    return;
  }
  demoState.offsetX += dx;
  demoState.offsetY += dy;
  setDemoViewMode("manual");
  updateDemoTransform();
};

const demoCanvas = document.createElement("canvas");
const demoCanvasCtx = demoCanvas.getContext("2d");

const showDemoLoupe = (clientX, clientY) => {
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

const getLocalOwnerId = () => state.clientId || "local";

const getLocalVideoSourcesByKind = (kind) =>
  Array.from(state.localVideoSources.values()).filter((source) => source.kind === kind);

const getLocalVideoSourceCount = (kind) => getLocalVideoSourcesByKind(kind).length;

const allocateLocalVideoSourceId = (kind) => {
  state.videoSourceSeq += 1;
  return `${getLocalOwnerId()}:${kind}:${state.videoSourceSeq}`;
};

const composeLocalVideoLabel = (kind, index) =>
  `${state.name} (you) - ${kind === "screen" ? "screen" : "camera"} ${index}`;

const composeRemoteVideoLabel = (name, kind, trackLabel = "") => {
  const base = String(name || "Guest");
  const trackText = String(trackLabel || "").trim();
  if (trackText) {
    return `${base} - ${trackText}`;
  }
  return `${base} - ${kind === "screen" ? "screen" : "camera"}`;
};

const removeDemoSourcesByOwner = (ownerId, options = {}) => {
  const ids = [];
  demoSources.forEach((source, id) => {
    if (source?.ownerId === ownerId) {
      ids.push(id);
    }
  });
  ids.forEach((id) => removeDemoSource(id, options));
};

const showDemoPlaceholder = (text = "Нет активной демонстрации экрана") => {
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

const updateDemoSelect = () => {
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

const announceDemoStart = (label) => {
  appendChatMessage({
    name: "Система",
    text: `${label} начал демонстрацию`,
    ts: Date.now()
  });
};

const announceDemoStop = (label) => {
  appendChatMessage({
    name: "Система",
    text: `${label} завершил демонстрацию`,
    ts: Date.now()
  });
};

const removeDemoSource = (sourceId, options = {}) => {
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

const upsertDemoSource = (sourceId, payload, options = {}) => {
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

const fitDemoToViewport = (options = {}) => {
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

const resetDemoView = () => {
  demoState.scale = 1;
  demoState.offsetX = 0;
  demoState.offsetY = 0;
  setDemoViewMode("manual");
  updateDemoTransform();
};

const selectDemoSourceByStep = (delta) => {
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

const isDemoFullscreen = () => {
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

const isCameraPreviewFullscreen = () => {
  const element = document.fullscreenElement;
  if (!element) {
    return false;
  }
  return (
    element === cameraPreview ||
    element === cameraPreviewVideo ||
    Boolean(cameraPreview && cameraPreview.contains(element))
  );
};

const toggleDemoFullscreen = async () => {
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

const toggleCameraPreviewFullscreen = async () => {
  if (!cameraPreview || cameraPreview.classList.contains("hidden")) {
    return;
  }
  try {
    if (isCameraPreviewFullscreen()) {
      await document.exitFullscreen();
    } else {
      await cameraPreview.requestFullscreen();
    }
  } catch {}
};

const setDemoImageSource = (sourceId) => {
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

const refreshPrimaryMediaStreams = () => {
  const cameraSources = getLocalVideoSourcesByKind("camera");
  const screenSources = getLocalVideoSourcesByKind("screen");
  if (state.primaryCameraSourceId && !state.localVideoSources.has(state.primaryCameraSourceId)) {
    state.primaryCameraSourceId = null;
  }
  if (!state.primaryCameraSourceId && cameraSources.length) {
    state.primaryCameraSourceId = cameraSources[cameraSources.length - 1].id;
  }
  state.cameraStream = state.primaryCameraSourceId
    ? state.localVideoSources.get(state.primaryCameraSourceId)?.stream || null
    : null;
  state.screenStream = screenSources.length ? screenSources[screenSources.length - 1].stream : null;
};

const applyVideoTrackHints = (track, kind) => {
  if (!track) {
    return;
  }
  try {
    track.contentHint = kind === "screen" ? "detail" : "motion";
  } catch {}
};

const tuneVideoSender = (sender, kind) => {
  if (!sender) {
    return;
  }
  const targetBitrate = kind === "screen" ? 10000000 : 2500000;
  const targetFps = kind === "screen" ? 60 : 30;
  try {
    const params = sender.getParameters?.() || {};
    if (!params.encodings || !params.encodings.length) {
      params.encodings = [{}];
    }
    params.degradationPreference = kind === "screen" ? "maintain-resolution" : "balanced";
    params.encodings = params.encodings.map((encoding) => ({
      ...encoding,
      maxBitrate: targetBitrate,
      maxFramerate: targetFps,
      scaleResolutionDownBy: 1
    }));
    sender.setParameters?.(params).catch(() => {});
  } catch {}
};

const attachLocalSourceToPeer = (source, peerId, peer) => {
  if (!source || !peer || source.senders.has(peerId)) {
    return;
  }
  const sender = peer.pc.addTrack(source.track, source.stream);
  source.senders.set(peerId, sender);
  tuneVideoSender(sender, source.kind);
};

const addLocalVideoSource = (kind, stream, options = {}) => {
  const { autoSelect = "always", announce = true } = options;
  const track = stream?.getVideoTracks?.()[0] || null;
  if (!track) {
    stream?.getTracks?.().forEach((item) => item.stop());
    return null;
  }
  applyVideoTrackHints(track, kind);
  const nextIndex = getLocalVideoSourceCount(kind) + 1;
  const sourceId = allocateLocalVideoSourceId(kind);
  const source = {
    id: sourceId,
    ownerId: getLocalOwnerId(),
    kind,
    stream,
    track,
    trackLabel: String(track.label || "").trim(),
    label: composeLocalVideoLabel(kind, nextIndex),
    senders: new Map()
  };
  state.localVideoSources.set(sourceId, source);
  if (kind === "camera") {
    state.primaryCameraSourceId = sourceId;
  }
  state.peers.forEach((peer, peerId) => {
    attachLocalSourceToPeer(source, peerId, peer);
    sendOfferToPeer(peerId).catch(() => {});
  });
  upsertDemoSource(
    sourceId,
    {
      label: source.label,
      stream,
      trackId: track.id,
      isLocal: true,
      ownerId: source.ownerId,
      kind,
      trackLabel: source.trackLabel
    },
    { autoSelect, announce }
  );
  if (state.ws && state.clientId) {
    sendMessage({
      type: "demo-start",
      sourceId,
      kind,
      trackId: track.id,
      label: source.label
    });
  }
  track.onended = () => {
    stopLocalVideoSource(sourceId, {
      silent: true,
      announce: false,
      notify: true,
      skipTrackStop: true,
      renegotiate: true
    });
  };
  refreshPrimaryMediaStreams();
  if (state.cameraStream) {
    showCameraPreview(state.cameraStream);
  } else {
    hideCameraPreview();
  }
  updateCameraButtonLabel();
  updateDemoButtonLabel();
  return sourceId;
};

const stopLocalVideoSource = (sourceId, options = {}) => {
  const {
    silent = false,
    announce = true,
    notify = true,
    skipTrackStop = false,
    renegotiate = true
  } = options;
  const source = state.localVideoSources.get(sourceId);
  if (!source) {
    return false;
  }
  state.localVideoSources.delete(sourceId);
  if (source.track) {
    source.track.onended = null;
  }
  if (!skipTrackStop) {
    source.stream.getTracks().forEach((track) => track.stop());
  }
  source.senders.forEach((sender, peerId) => {
    const peer = state.peers.get(peerId);
    if (!peer) {
      return;
    }
    try {
      peer.pc.removeTrack(sender);
    } catch {}
    if (renegotiate) {
      sendOfferToPeer(peerId).catch(() => {});
    }
  });
  source.senders.clear();
  removeDemoSource(sourceId, { announce });
  if (notify && state.ws && state.clientId) {
    sendMessage({
      type: "demo-stop",
      sourceId,
      kind: source.kind,
      trackId: source.track?.id || "",
      label: source.label
    });
  }
  refreshPrimaryMediaStreams();
  if (state.cameraStream) {
    showCameraPreview(state.cameraStream);
  } else {
    hideCameraPreview();
  }
  updateCameraButtonLabel();
  updateDemoButtonLabel();
  if (!silent) {
    log((source.kind === "screen" ? "Screen" : "Camera") + " stopped");
  }
  return true;
};

const stopLocalVideoSourcesByKind = (kind, options = {}) => {
  const ids = getLocalVideoSourcesByKind(kind).map((source) => source.id);
  if (!ids.length) {
    return false;
  }
  ids.forEach((id) => {
    stopLocalVideoSource(id, options);
  });
  return true;
};

const updateDemoButtonLabel = () => {
  refreshPrimaryMediaStreams();
  const screenCount = getLocalVideoSourceCount("screen");
  if (!demoButton) {
    updateDemoControlState();
    return;
  }
  demoButton.textContent = screenCount > 0 ? "Demo (" + screenCount + ")" : "Demo";
  updateDemoControlState();
};

const updateCameraButtonLabel = () => {
  refreshPrimaryMediaStreams();
  if (!cameraButton) {
    return;
  }
  const cameraCount = getLocalVideoSourceCount("camera");
  cameraButton.textContent = cameraCount > 0 ? "Camera: on (" + cameraCount + ")" : "Camera: off";
};

const buildCameraVideoConstraints = (facing = state.cameraFacing, deviceId = "") => {
  const constraints = {
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 30, max: 30 }
  };
  if (deviceId) {
    constraints.deviceId = { exact: deviceId };
  } else if (isMobileCallMode) {
    constraints.facingMode = { ideal: facing };
  }
  return constraints;
};

const updateCameraSwitchButtonLabel = () => {
  if (!cameraSwitchButton) {
    return;
  }
  if (isMobileCallMode) {
    cameraSwitchButton.textContent =
      state.cameraFacing === "environment" ? "Camera: back" : "Camera: front";
    return;
  }
  cameraSwitchButton.textContent =
    state.cameraFacing === "environment" ? "Camera: back" : "Camera: front";
};

const stopCamera = (silent = false) => {
  const hadCameras = stopLocalVideoSourcesByKind("camera", {
    silent: true,
    announce: false,
    notify: true,
    renegotiate: true
  });
  if (!hadCameras) {
    hideCameraPreview();
    updateCameraButtonLabel();
    return;
  }
  if (!silent) {
    log("Cameras disabled");
  }
};

const requestCameraStream = async (facing = state.cameraFacing, deviceId = "") => {
  const preferred = {
    video: buildCameraVideoConstraints(facing, deviceId),
    audio: false
  };
  try {
    return await navigator.mediaDevices.getUserMedia(preferred);
  } catch {
    return navigator.mediaDevices.getUserMedia({
      video: deviceId ? { deviceId: { exact: deviceId } } : true,
      audio: false
    });
  }
};

// ============================================================
// Local video sources (camera / screen)
// ============================================================

const startCamera = async (options = {}) => {
  const { deviceId = "" } = options;
  if (!window.isSecureContext) {
    log("Camera unavailable: HTTPS required");
    return false;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    log("Camera is not supported in this browser");
    return false;
  }
  try {
    const stream = await requestCameraStream(state.cameraFacing, deviceId);
    const sourceId = addLocalVideoSource("camera", stream, { autoSelect: "always", announce: false });
    if (!sourceId) {
      throw new Error("no-camera-track");
    }
    updateCameraButtonLabel();
    log("Camera added");
    return true;
  } catch (error) {
    updateCameraButtonLabel();
    log("Camera: " + formatMediaError(error, "failed to enable"));
    return false;
  }
};

const toggleCamera = async () => {
  if (getLocalVideoSourceCount("camera") > 0) {
    stopCamera();
    return;
  }
  await startCamera();
};

const switchCameraFacing = async () => {
  if (!isMobileCallMode) {
    return false;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    log("Camera is not supported in this browser");
    return false;
  }
  const nextFacing = state.cameraFacing === "user" ? "environment" : "user";
  const source =
    (state.primaryCameraSourceId && state.localVideoSources.get(state.primaryCameraSourceId)) ||
    getLocalVideoSourcesByKind("camera").slice(-1)[0] ||
    null;
  if (!source) {
    state.cameraFacing = nextFacing;
    updateCameraSwitchButtonLabel();
    log("Camera mode: " + (nextFacing === "user" ? "front" : "back"));
    return true;
  }
  try {
    const nextStream = await requestCameraStream(nextFacing);
    const nextTrack = nextStream.getVideoTracks()[0];
    if (!nextTrack) {
      nextStream.getTracks().forEach((track) => track.stop());
      throw new Error("no-video-track");
    }
    const previousStream = source.stream;
    const previousTrack = source.track;
    state.cameraFacing = nextFacing;
    source.stream = nextStream;
    source.track = nextTrack;
    source.trackLabel = String(nextTrack.label || "").trim();
    applyVideoTrackHints(nextTrack, "camera");
    const replaceTasks = [];
    source.senders.forEach((sender) => {
      if (sender?.track?.kind === "video") {
        replaceTasks.push(sender.replaceTrack(nextTrack));
      }
    });
    await Promise.allSettled(replaceTasks);
    source.senders.forEach((sender) => tuneVideoSender(sender, "camera"));
    if (previousTrack) {
      previousTrack.onended = null;
    }
    previousStream.getTracks().forEach((track) => track.stop());
    nextTrack.onended = () => {
      stopLocalVideoSource(source.id, {
        silent: true,
        announce: false,
        notify: true,
        skipTrackStop: true,
        renegotiate: true
      });
    };
    upsertDemoSource(
      source.id,
      {
        stream: nextStream,
        trackId: nextTrack.id,
        trackLabel: source.trackLabel
      },
      { autoSelect: "if-current" }
    );
    if (state.ws && state.clientId) {
      sendMessage({
        type: "demo-start",
        sourceId: source.id,
        kind: "camera",
        trackId: nextTrack.id,
        label: source.label
      });
    }
    refreshPrimaryMediaStreams();
    if (state.cameraStream) {
      showCameraPreview(state.cameraStream);
    }
    updateCameraSwitchButtonLabel();
    log("Camera switched");
    return true;
  } catch (error) {
    log("Camera: " + formatMediaError(error, "failed to switch"));
    return false;
  }
};

const stopScreenShare = (silent = false) => {
  const hadShares = stopLocalVideoSourcesByKind("screen", {
    silent: true,
    announce: true,
    notify: true,
    renegotiate: true
  });
  if (!hadShares) {
    updateDemoButtonLabel();
    return;
  }
  if (!silent) {
    log("Screen shares stopped");
  }
};

const startScreenShare = async () => {
  if (!window.isSecureContext) {
    log("Screen sharing unavailable: HTTPS required");
    return false;
  }
  if (!navigator.mediaDevices?.getDisplayMedia) {
    log("Screen sharing is not supported in this browser");
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: 60, max: 60 },
        width: { ideal: 2560, max: 3840 },
        height: { ideal: 1440, max: 2160 }
      },
      audio: false
    });
    const sourceId = addLocalVideoSource("screen", stream, { autoSelect: "always", announce: true });
    if (!sourceId) {
      throw new Error("no-screen-track");
    }
    return true;
  } catch (error) {
    log("Screen sharing: " + formatMediaError(error, "failed to start"));
    return false;
  }
};

const openDemoModal = async () => {
  if (!demoModal || !demoStage || !demoVideo || !demoLoader) {
    log("Демо окно недоступно");
    return;
  }
  demoModal.classList.add("open");
  demoModal.setAttribute("aria-hidden", "false");
  updateModalOverlayState();
  if (!isMobileCallMode) {
    if (!demoWindowState.placed) {
      placeDemoWindowDefault();
    } else {
      applyDemoWindowRect();
    }
  }
  demoStage.focus();
  updateDemoSelect();
  const storedSource = readStorage(STORAGE_KEYS.demoSourceId);
  if (!DEMO_COMPACT_WINDOW) {
    const storedZoom = Number(readStorage(STORAGE_KEYS.demoZoom));
    const storedX = Number(readStorage(STORAGE_KEYS.demoOffsetX));
    const storedY = Number(readStorage(STORAGE_KEYS.demoOffsetY));
    const storedMode = readStorage(STORAGE_KEYS.demoViewMode);
    if (!Number.isNaN(storedZoom) && storedZoom > 0) {
      demoState.scale = storedZoom;
    }
    if (!Number.isNaN(storedX)) {
      demoState.offsetX = storedX;
    }
    if (!Number.isNaN(storedY)) {
      demoState.offsetY = storedY;
    }
    if (storedMode === "fit" || storedMode === "manual") {
      setDemoViewMode(storedMode, { persist: false });
    } else {
      setDemoViewMode("fit", { persist: false });
    }
    if (demoState.viewMode !== "fit") {
      updateDemoTransform();
    }
  } else {
    demoState.scale = 1;
    demoState.offsetX = 0;
    demoState.offsetY = 0;
    setDemoViewMode("fit", { persist: false });
    updateDemoTransform();
  }
  const fallbackSource =
    (storedSource && demoSources.has(storedSource) && storedSource) ||
    demoSources.keys().next().value;
  if (fallbackSource) {
    setDemoImageSource(fallbackSource);
  } else {
    showDemoPlaceholder();
  }
  updateDemoControlState();
};

const closeDemoModal = () => {
  if (!demoModal) {
    return;
  }
  if (isDemoFullscreen()) {
    document.exitFullscreen().catch(() => {});
  }
  demoState.dragging = false;
  demoState.stagePointerId = null;
  demoStage?.classList.remove("is-dragging");
  demoModalContent?.classList.remove("is-dragging");
  demoModalContent?.classList.remove("is-resizing");
  demoModal.classList.remove("open");
  demoModal.setAttribute("aria-hidden", "true");
  updateModalOverlayState();
};

const updateRoomInfo = () => {
  roomIdEl.textContent = state.roomId || "—";
  if (!state.roomId) {
    roomLinkEl.textContent = "—";
    if (copyLinkButton) {
      copyLinkButton.disabled = true;
    }
    return;
  }
  const link = state.key
    ? `${location.origin}/#room=${state.roomId}&key=${state.key}`
    : `${location.origin}/#room=${state.roomId}`;
  roomLinkEl.textContent = link;
  if (copyLinkButton) {
    copyLinkButton.disabled = false;
  }
};

const clampVolume = (value) => Math.min(300, Math.max(0, value));

const ensureAudioOutput = (audio) => {
  try {
    if (!state.audioContext) {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (state.audioContext.state !== "running") {
      if (state.remoteAudioOutputs.has(audio.id)) {
        cleanupAudioOutput(audio.id);
      }
      state.audioContext.resume().catch(() => {});
    }
    if (state.audioContext.state !== "running") {
      return null;
    }
    if (state.remoteAudioOutputs.has(audio.id)) {
      return state.remoteAudioOutputs.get(audio.id);
    }
    const source = state.audioContext.createMediaElementSource(audio);
    const gain = state.audioContext.createGain();
    source.connect(gain).connect(state.audioContext.destination);
    const output = { source, gain };
    state.remoteAudioOutputs.set(audio.id, output);
    return output;
  } catch {
    return null;
  }
};

const cleanupAudioOutput = (audioId) => {
  const output = state.remoteAudioOutputs.get(audioId);
  if (!output) {
    return;
  }
  output.source.disconnect();
  output.gain.disconnect();
  state.remoteAudioOutputs.delete(audioId);
};

const applyVolumeToElement = (audio, level) => {
  const safeLevel = clampVolume(level);
  const gainValue = safeLevel / 100;
  const output = ensureAudioOutput(audio);
  if (output) {
    output.gain.gain.value = gainValue;
    audio.volume = 1;
    return;
  }
  audio.volume = Math.min(1, gainValue);
};

const resolveParticipantId = (value) => {
  const lower = value.toLowerCase();
  if (state.participants.has(value)) {
    return value;
  }
  const matches = Array.from(state.participants.values()).filter(
    (participant) => participant.name.toLowerCase() === lower
  );
  if (matches.length === 1) {
    return matches[0].id;
  }
  return null;
};

const getAudioElement = (participantId) =>
  document.getElementById(`audio-${participantId}`);

const setParticipantVolume = (participantId, level) => {
  const safeLevel = clampVolume(level);
  state.userVolumes.set(participantId, safeLevel);
  const audio = getAudioElement(participantId);
  if (audio) {
    applyVolumeToElement(audio, safeLevel);
  }
};

const createWorkletModule = async () => {
  try {
    if (!state.audioContext) {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (state.audioContext.state === "suspended") {
      await state.audioContext.resume();
    }
    if (state.workletReady) {
      return;
    }
    const response = await fetch("/vendor/rnnoise-sync.js");
    if (!response.ok) {
      throw new Error(`rnnoise fetch failed: ${response.status}`);
    }
    const rnnoiseCode = await response.text();
    const processorCode = `
${rnnoiseCode}
class RnnoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameSize = 480;
    this.pending = new Float32Array(this.frameSize);
    this.pendingIndex = 0;
    this.outputQueue = [];
    this.outputIndex = 0;
    this.mix = 1;
    this.gateThreshold = 0.078;
    this.gateFloor = 0.003;
    this.gateAttack = 0.006;
    this.gateRelease = 0.3;
    this.gateGain = 1;
    this.attackCoeff = Math.exp(-1 / (sampleRate * this.gateAttack));
    this.releaseCoeff = Math.exp(-1 / (sampleRate * this.gateRelease));
    this.ready = false;
    this.port.onmessage = (event) => {
      if (event.data && event.data.type === "level") {
        const value = Number(event.data.value);
        if (!Number.isNaN(value)) {
          this.mix = Math.min(1, Math.max(0, value));
        }
      }
    };
    this.module = createRNNWasmModuleSync();
    this.module.ready.then(() => {
      this.statePtr = this.module._rnnoise_create();
      this.inPtr = this.module._malloc(this.frameSize * 4);
      this.outPtr = this.module._malloc(this.frameSize * 4);
      this.inHeap = this.module.HEAPF32.subarray(
        this.inPtr >> 2,
        (this.inPtr >> 2) + this.frameSize
      );
      this.outHeap = this.module.HEAPF32.subarray(
        this.outPtr >> 2,
        (this.outPtr >> 2) + this.frameSize
      );
      this.ready = true;
    });
  }
  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || output.length === 0) {
      return true;
    }
    const inputChannel = input && input[0] ? input[0] : null;
    const outputChannel = output[0];
    let rms = 0;
    if (inputChannel) {
      let sum = 0;
      for (let i = 0; i < inputChannel.length; i += 1) {
        const sample = inputChannel[i];
        sum += sample * sample;
      }
      rms = Math.sqrt(sum / inputChannel.length);
    }
    const targetGate = rms < this.gateThreshold ? 0 : 1;
    for (let i = 0; i < outputChannel.length; i += 1) {
      const sample = inputChannel ? inputChannel[i] : 0;
      let processed = sample;
      if (this.ready) {
        this.pending[this.pendingIndex] = sample;
        this.pendingIndex += 1;
        if (this.pendingIndex >= this.frameSize) {
          this.inHeap.set(this.pending);
          this.module._rnnoise_process_frame(this.statePtr, this.outPtr, this.inPtr);
          this.outputQueue.push(Float32Array.from(this.outHeap));
          this.pendingIndex = 0;
        }
      }
      if (this.outputQueue.length > 0) {
        processed = this.outputQueue[0][this.outputIndex];
        this.outputIndex += 1;
        if (this.outputIndex >= this.frameSize) {
          this.outputQueue.shift();
          this.outputIndex = 0;
        }
      }
      const mixed = processed * this.mix + sample * (1 - this.mix);
      const coeff = targetGate > this.gateGain ? this.attackCoeff : this.releaseCoeff;
      this.gateGain = targetGate + (this.gateGain - targetGate) * coeff;
      const gate = this.gateGain + this.gateFloor * (1 - this.gateGain);
      outputChannel[i] = mixed * gate;
    }
    for (let c = 1; c < output.length; c += 1) {
      output[c].set(outputChannel);
    }
    return true;
  }
}
registerProcessor("rnnoise-processor", RnnoiseProcessor);
`;
    const blob = new Blob([processorCode], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    await state.audioContext.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    state.workletReady = true;
  } catch (err) {
    log("Шумоподавление недоступно, используем обычный звук");
    throw err;
  }
};

const ensureProcessedStream = async () => {
  if (state.processedStream) {
    return state.processedStream;
  }
  if (!state.rawStream) {
    throw new Error("rawStream missing");
  }
  await createWorkletModule();
  const source = state.audioContext.createMediaStreamSource(state.rawStream);
  const processor = new AudioWorkletNode(state.audioContext, "rnnoise-processor", {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: 1
  });
  const highpass = state.audioContext.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 170;
  highpass.Q.value = 0.7;
  const lowpass = state.audioContext.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 11000;
  lowpass.Q.value = 0.7;
  const compressor = state.audioContext.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 24;
  compressor.ratio.value = 6;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.15;
  const destination = state.audioContext.createMediaStreamDestination();
  source.connect(highpass).connect(lowpass).connect(processor).connect(compressor).connect(destination);
  processor.port.postMessage({ type: "level", value: Math.min(1, state.noiseLevel / 75) });
  state.processingSource = source;
  state.processingNode = processor;
  state.processingDestination = destination;
  state.processedStream = destination.stream;
  return state.processedStream;
};

const replaceAudioTrack = (track) => {
  state.peers.forEach(({ pc }) => {
    const sender = pc.getSenders().find((s) => s.track && s.track.kind === "audio");
    if (sender) {
      sender.replaceTrack(track);
    }
  });
};

const setLocalStream = (stream) => {
  state.localStream = stream;
  const track = stream.getAudioTracks()[0];
  if (track) {
    track.enabled = !state.muted;
    replaceAudioTrack(track);
  }
  setupAudioMeter(stream);
};

const ensureLocalStream = async () => {
  if (state.rawStream) {
    return state.localStream;
  }
  state.rawStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });
  let nextStream = state.rawStream;
  if (state.neuralNoiseSuppression) {
    nextStream = await ensureProcessedStream();
  }
  setLocalStream(nextStream);
  return state.localStream;
};

const setupAudioMeter = (stream) => {
  if (!state.audioContext) {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (state.analyserStreamId === stream.id) {
    return;
  }
  const analyser = state.audioContext.createAnalyser();
  analyser.fftSize = 512;
  if (state.meterSource) {
    state.meterSource.disconnect();
  }
  const source = state.audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
  state.analyser = analyser;
  state.meterSource = source;
  state.analyserStreamId = stream.id;

  if (!state.activityTimer) {
    state.activityTimer = setInterval(() => {
      if (!state.analyser || state.muted) {
        if (state.active) {
          state.active = false;
          sendActivity(false);
          updateLocalParticipant({ active: false });
        }
        return;
      }
      const buffer = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        const v = (buffer[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buffer.length);
      const nextActive = rms > 0.04;
      if (state.active !== nextActive) {
        state.active = nextActive;
        sendActivity(nextActive);
        updateLocalParticipant({ active: nextActive });
      }
    }, 250);
  }
};

const sendActivity = (active) => {
  sendMessage({ type: "activity", active });
};

// ============================================================
// Participant state
// ============================================================

const updateName = (nextName) => {
  state.name = nextName.slice(0, 24);
  writeStorage(STORAGE_KEYS.name, state.name);
  const counters = { camera: 0, screen: 0 };
  state.localVideoSources.forEach((source, id) => {
    if (!source) {
      return;
    }
    counters[source.kind] = (counters[source.kind] || 0) + 1;
    const label = composeLocalVideoLabel(source.kind, counters[source.kind]);
    source.label = label;
    upsertDemoSource(id, { ...source, label }, { autoSelect: "if-current" });
    if (state.ws && state.clientId) {
      sendMessage({
        type: "demo-start",
        sourceId: id,
        kind: source.kind,
        trackId: source.track?.id || "",
        label
      });
    }
  });
  if (state.clientId) {
    updateLocalParticipant({ name: state.name });
    sendMessage({ type: "name", name: state.name });
  }
  if (state.globalWs && state.globalWs.readyState === WebSocket.OPEN) {
    sendGlobalSocketMessage({ type: "global-name", name: state.name });
  }
};

const toggleNeuralNoiseSuppression = async () => {
  state.neuralNoiseSuppression = !state.neuralNoiseSuppression;
  if (!state.rawStream) {
    noiseButton.textContent = state.neuralNoiseSuppression
      ? "Нейро-шумоподавление: вкл"
      : "Нейро-шумоподавление: выкл";
    return;
  }
  try {
    const nextStream = state.neuralNoiseSuppression
      ? await ensureProcessedStream()
      : state.rawStream;
    setLocalStream(nextStream);
    if (state.neuralNoiseSuppression && state.processingNode) {
      state.processingNode.port.postMessage({
        type: "level",
        value: Math.min(1, state.noiseLevel / 75)
      });
    }
  } catch {
    state.neuralNoiseSuppression = false;
    setLocalStream(state.rawStream);
    log("Не удалось включить шумоподавление");
  }
  noiseButton.textContent = state.neuralNoiseSuppression
    ? "Шумоподавление: вкл"
    : "Шумоподавление: выкл";
};

const setNoiseLevel = (value) => {
  const nextLevel = Math.min(100, Math.max(0, value));
  state.noiseLevel = nextLevel;
  if (state.processingNode) {
    state.processingNode.port.postMessage({
      type: "level",
      value: state.noiseLevel / 100
    });
  }
};

const sendMessage = (payload) => {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(payload));
  }
};

const getWsUrl = () => {
  const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
  return `${wsProtocol}://${location.host}`;
};

const sendGlobalSocketMessage = (payload) => {
  if (state.globalWs && state.globalWs.readyState === WebSocket.OPEN) {
    state.globalWs.send(JSON.stringify(payload));
    return true;
  }
  return false;
};

const scheduleGlobalChatReconnect = () => {
  if (state.globalChatRetryTimer) {
    return;
  }
  state.globalChatRetryTimer = setTimeout(() => {
    state.globalChatRetryTimer = null;
    connectGlobalChatSocket();
  }, GLOBAL_CHAT_RETRY_MS);
};

const connectGlobalChatSocket = () => {
  if (
    state.globalWs &&
    (state.globalWs.readyState === WebSocket.OPEN ||
      state.globalWs.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }
  const ws = new WebSocket(getWsUrl());
  state.globalWs = ws;
  ws.onopen = () => {
    if (state.globalChatRetryTimer) {
      clearTimeout(state.globalChatRetryTimer);
      state.globalChatRetryTimer = null;
    }
    sendGlobalSocketMessage({ type: "global-subscribe", name: state.name });
  };
  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!msg || typeof msg !== "object") {
      return;
    }
    if (msg.type === "global-history") {
      renderGlobalChatHistory(msg.messages);
      return;
    }
    if (msg.type === "global-chat") {
      appendGlobalChatMessage(msg);
    }
  };
  ws.onclose = () => {
    if (state.globalWs === ws) {
      state.globalWs = null;
    }
    scheduleGlobalChatReconnect();
  };
  ws.onerror = () => {};
};

const isRoomConnected = () => Boolean(state.ws && state.ws.readyState === WebSocket.OPEN);

const requireRoomConnection = () => {
  if (isRoomConnected()) {
    return true;
  }
  log("Connect to room first: use create or join");
  return false;
};

const cleanupConnections = () => {
  clearAllOfferRetries();
  state.peers.forEach((peer) => {
    peer.pc.close();
  });
  state.peers.clear();
  if (state.ws) {
    state.ws.close();
  }
  if (state.rawStream) {
    state.rawStream.getTracks().forEach((track) => track.stop());
  }
  if (state.processedStream) {
    state.processedStream.getTracks().forEach((track) => track.stop());
  }
  if (state.processingSource) {
    state.processingSource.disconnect();
  }
  if (state.processingNode) {
    state.processingNode.disconnect();
  }
  if (state.processingDestination) {
    state.processingDestination.disconnect();
  }
  if (state.activityTimer) {
    clearInterval(state.activityTimer);
  }
  state.localVideoSources.forEach((source) => {
    source?.stream?.getTracks?.().forEach((track) => track.stop());
    source?.senders?.clear?.();
  });
  state.localVideoSources.clear();
  hideCameraPreview();
  state.screenSenders.clear();
  state.cameraSenders.clear();
  state.ws = null;
  state.rawStream = null;
  state.processedStream = null;
  state.localStream = null;
  state.cameraStream = null;
  state.screenStream = null;
  state.primaryCameraSourceId = null;
  state.videoSourceSeq = 0;
  state.participants.clear();
  state.userVolumes.clear();
  state.clientId = null;
  state.active = false;
  state.muted = true;
  state.neuralNoiseSuppression = true;
  state.noiseLevel = 100;
  muteButton.textContent = "Микрофон: выкл";
  muteButton.disabled = false;
  noiseButton.textContent = "Шумоподавление: вкл";
  noiseButton.disabled = false;
  if (cameraButton) {
    cameraButton.disabled = false;
  }
  if (cameraSwitchButton) {
    cameraSwitchButton.disabled = !isMobileCallMode;
  }
  state.cameraFacing = "user";
  updateCameraButtonLabel();
  updateCameraSwitchButtonLabel();
  leaveButton.disabled = false;
  if (demoButton) {
    demoButton.disabled = false;
  }
  updateDemoButtonLabel();
  renderParticipants();
  if (chatLogEl) {
    chatLogEl.innerHTML = "";
    chatPanelEl?.classList.add("is-empty");
  }
  if (chatFileInput) {
    chatFileInput.value = "";
  }
  updateChatFileButton();
  updateMobileChatControls();
  if (isMobileCallMode) {
    setMobileTab("room");
  }
  setMobileChatUnread(false);
  setMobileConsoleUnread(false);
  updateMobileKeyboardState();
  state.remoteAudioOutputs.forEach((output) => {
    output.source.disconnect();
    output.gain.disconnect();
  });
  state.remoteAudioOutputs.clear();
  demoSources.clear();
  demoState.sourceId = null;
  demoState.viewMode = "fit";
  demoState.dragging = false;
  demoState.stagePointerId = null;
  demoStage?.classList.remove("is-dragging");
  if (demoState.loupeTimer) {
    clearTimeout(demoState.loupeTimer);
    demoState.loupeTimer = null;
  }
  if (demoVideo) {
    demoVideo.srcObject = null;
  }
  if (demoUserSelect) {
    demoUserSelect.innerHTML = "";
    demoUserSelect.disabled = true;
  }
  showDemoPlaceholder();
};

const ensurePeer = (peerId) => {
  if (state.peers.has(peerId)) {
    return state.peers.get(peerId);
  }
  const pc = new RTCPeerConnection({
    iceServers: state.iceServers && state.iceServers.length ? state.iceServers : DEFAULT_ICE_SERVERS
  });
  const stream = state.localStream;
  if (stream) {
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  }
  state.localVideoSources.forEach((source) => {
    attachLocalSourceToPeer(source, peerId, { pc });
  });
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendMessage({
        type: "signal",
        to: peerId,
        data: { type: "ice", candidate: event.candidate.toJSON() }
      });
    }
  };
  pc.onnegotiationneeded = () => {
    sendOfferToPeer(peerId).catch(() => {});
  };
  pc.ontrack = (event) => {
    if (event.track.kind === "video") {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      const participant = state.participants.get(peerId);
      const ownerName = participant?.name || "Guest";
      const trackId = event.track.id;
      const trackLabel = String(event.track.label || "").trim();
      const kind = /screen|display|window|monitor|tab/i.test(trackLabel) ? "screen" : "camera";
      const sourceId = `${peerId}:${trackId}`;
      const label = composeRemoteVideoLabel(ownerName, kind, trackLabel);
      upsertDemoSource(
        sourceId,
        {
          label,
          stream: remoteStream,
          trackId,
          isLocal: false,
          ownerId: peerId,
          kind,
          trackLabel
        },
        { autoSelect: "if-empty-or-current" }
      );
      if (demoModal && !demoModal.classList.contains("open")) {
        openDemoModal();
      }
      event.track.onended = () => {
        const current = demoSources.get(sourceId);
        if (current?.trackId === trackId) {
          removeDemoSource(sourceId);
        }
      };
      event.track.onmute = () => {
        const current = demoSources.get(sourceId);
        if (current?.trackId === trackId && demoState.sourceId === sourceId) {
          showDemoPlaceholder("Stream paused");
        }
      };
      event.track.onunmute = () => {
        const current = demoSources.get(sourceId);
        if (current?.trackId === trackId && demoState.sourceId === sourceId) {
          setDemoImageSource(sourceId);
        }
      };
      return;
    }
    let audio = document.getElementById(`audio-${peerId}`);
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = `audio-${peerId}`;
      audio.autoplay = true;
      audio.playsInline = true;
      audio.muted = false;
      const stored = state.userVolumes.get(peerId);
      applyVolumeToElement(audio, stored ?? 100);
      document.body.appendChild(audio);
    }
    const remoteStream = event.streams[0] || new MediaStream([event.track]);
    audio.srcObject = remoteStream;
    audio.play().catch(() => {});
  };
  state.peers.set(peerId, { pc, pendingCandidates: [], makingOffer: false });
  return state.peers.get(peerId);
};

const toggleMute = () => {
  state.muted = !state.muted;
  if (state.localStream) {
    state.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !state.muted;
    });
  }
  if (muteButton) {
    muteButton.textContent = state.muted ? "Mic: off" : "Mic: on";
  }
  sendMessage({ type: "mute", muted: state.muted });
  updateLocalParticipant({ muted: state.muted, active: state.muted ? false : state.active });
  if (state.muted) {
    sendActivity(false);
  }
};

const toggleNoiseSuppression = async () => {
  await toggleNeuralNoiseSuppression();
};

// ============================================================
// Room lifecycle
// ============================================================

const leaveRoom = () => {
  if (state.ws) {
    try {
      state.ws.close();
    } catch {}
  } else {
    cleanupConnections();
  }
};

// ============================================================
// Command parser and handlers
// ============================================================

const handleCommand = async (input) => {
  const parts = String(input || "").trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1);
  if (!cmd) {
    return;
  }
  if (cmd === "help") {
    log("Commands: ? | create [name] | join <link|roomId [key]|name> | id | name <nick> | avatar <auto|square|circle|diamond|hex|triangle> | mute | unmute | noise <0-100> | camera <on|off|toggle|add|list|remove|full> | demo <on|off|toggle|add|list|remove|full> | volume <id|name|all> <0-300> | chat <text> | file | chatpanel <hide|show|toggle> | theme | leave");
    return;
  }
  if (cmd === "?" || cmd === "/?" || cmd === "globalchat") {
    openGlobalChatModal();
    return;
  }
  if (cmd === "id") {
    log(state.clientId ? `Your id: ${state.clientId}` : "ID is available after joining a room");
    return;
  }
  if (cmd === "name") {
    const next = args.join(" ").trim();
    if (!next) {
      log("Format: name <nickname>");
      return;
    }
    updateName(next);
    return;
  }
  if (cmd === "avatar") {
    const shape = normalizeAvatarShape(args[0]);
    if (!shape) {
      log("Format: avatar <auto|square|circle|diamond|hex|triangle>");
      return;
    }
    setAvatarShape(shape);
    return;
  }
  if (cmd === "create") {
    try {
      const roomName = args.join(" ").trim();
      const created = await fetchCreateRoom(roomName);
      setRoomParams(created.roomId, created.key);
      await connectToRoom(created.roomId, created.key);
    } catch (err) {
      log(err instanceof Error && err.message === "room-name-taken" ? "Room name already exists" : "Failed to create room");
    }
    return;
  }
  if (cmd === "join") {
    if (!args.length) {
      log("Provide invite link, roomId, roomId key, or room name");
      return;
    }
    let roomId;
    let key = "";
    if (args.length >= 2) {
      roomId = args[0];
      key = args[1];
    } else {
      const candidate = args[0];
      try {
        const url = new URL(candidate, location.origin);
        const params = new URLSearchParams(url.hash.slice(1));
        roomId = params.get("room") || "";
        key = params.get("key") || "";
      } catch {
        roomId = candidate;
      }
    }
    if (!roomId) {
      log("Room id is required");
      return;
    }
    if (!looksLikeRoomId(roomId)) {
      const resolved = await resolveRoomName(roomId);
      if (!resolved) {
        log("Room not found");
        return;
      }
      roomId = resolved;
    }
    setRoomParams(roomId, key);
    await connectToRoom(roomId, key);
    return;
  }
  if (cmd === "mute") {
    if (!state.muted) {
      toggleMute();
    }
    return;
  }
  if (cmd === "unmute") {
    if (state.muted) {
      toggleMute();
    }
    return;
  }
  if (cmd === "noise") {
    const value = Number(args[0]);
    if (Number.isNaN(value)) {
      log("Format: noise <0-100>");
      return;
    }
    setNoiseLevel(value);
    log("Noise level: " + state.noiseLevel);
    return;
  }
  if (cmd === "camera") {
    const mode = (args[0] || "toggle").toLowerCase();
    if (mode === "toggle") {
      await toggleCamera();
      return;
    }
    if (mode === "on" || mode === "add") {
      await startCamera();
      return;
    }
    if (mode === "off") {
      stopCamera();
      return;
    }
    if (mode === "full" || mode === "fullscreen") {
      await toggleCameraPreviewFullscreen();
      return;
    }
    if (mode === "list") {
      const cameras = getLocalVideoSourcesByKind("camera");
      if (!cameras.length) {
        log("No active cameras");
        return;
      }
      cameras.forEach((source, index) => {
        log(`${index + 1}. ${source.id} | ${source.label}`);
      });
      return;
    }
    if (mode === "remove") {
      const token = args[1];
      const cameras = getLocalVideoSourcesByKind("camera");
      if (!token || !cameras.length) {
        log("Format: camera remove <id|index>");
        return;
      }
      const byIndex = Number(token);
      const target = Number.isInteger(byIndex) && byIndex > 0 ? cameras[byIndex - 1] : cameras.find((item) => item.id === token);
      if (!target) {
        log("Camera source not found");
        return;
      }
      stopLocalVideoSource(target.id);
      return;
    }
    log("Format: camera <on|off|toggle|add|list|remove|full>");
    return;
  }
  if (cmd === "demo") {
    const mode = (args[0] || "toggle").toLowerCase();
    if (mode === "toggle") {
      if (getLocalVideoSourceCount("screen") > 0) {
        stopScreenShare();
      } else {
        await startScreenShare();
      }
      return;
    }
    if (mode === "on" || mode === "add") {
      await startScreenShare();
      return;
    }
    if (mode === "off") {
      stopScreenShare();
      return;
    }
    if (mode === "full" || mode === "fullscreen") {
      await toggleDemoFullscreen();
      return;
    }
    if (mode === "list") {
      const shares = getLocalVideoSourcesByKind("screen");
      if (!shares.length) {
        log("No active screen shares");
        return;
      }
      shares.forEach((source, index) => {
        log(`${index + 1}. ${source.id} | ${source.label}`);
      });
      return;
    }
    if (mode === "remove") {
      const token = args[1];
      const shares = getLocalVideoSourcesByKind("screen");
      if (!token || !shares.length) {
        log("Format: demo remove <id|index>");
        return;
      }
      const byIndex = Number(token);
      const target = Number.isInteger(byIndex) && byIndex > 0 ? shares[byIndex - 1] : shares.find((item) => item.id === token);
      if (!target) {
        log("Share source not found");
        return;
      }
      stopLocalVideoSource(target.id);
      return;
    }
    log("Format: demo <on|off|toggle|add|list|remove|full>");
    return;
  }
  if (cmd === "volume") {
    const target = args[0];
    const value = Number(args[1]);
    if (!target || Number.isNaN(value)) {
      log("Format: volume <id|name|all> <0-300>");
      return;
    }
    if (target.toLowerCase() === "all") {
      state.participants.forEach((participant) => {
        if (participant.id !== state.clientId) {
          setParticipantVolume(participant.id, value);
        }
      });
      return;
    }
    const resolvedId = resolveParticipantId(target);
    if (!resolvedId || resolvedId === state.clientId) {
      log("Participant not found");
      return;
    }
    setParticipantVolume(resolvedId, value);
    return;
  }
  if (cmd === "chat") {
    const text = args.join(" ").trim();
    if (!text) {
      log("Format: chat <text>");
      return;
    }
    sendChatMessage(text);
    return;
  }
  if (cmd === "file") {
    openChatFilePicker();
    return;
  }
  if (cmd === "chatpanel") {
    const mode = (args[0] || "toggle").toLowerCase();
    if (mode === "toggle") {
      toggleChatHidden();
      return;
    }
    if (mode === "hide") {
      setChatHidden(true);
      return;
    }
    if (mode === "show") {
      setChatHidden(false);
      return;
    }
    log("Format: chatpanel <hide|show|toggle>");
    return;
  }
  if (cmd === "theme") {
    openThemeModal();
    return;
  }
  if (cmd === "leave") {
    leaveRoom();
    return;
  }
  log(`Unknown command: ${cmd}`);
};

// ============================================================
// Connection bootstrap
// ============================================================

const connectToRoom = async (roomId, key) => {
  if (state.ws) {
    log("Already connected");
    return;
  }
  await ensureIceServers();
  try {
    await ensureLocalStream();
  } catch {
    log("Microphone access denied");
    setStatus("Microphone access denied");
    return;
  }
  if (state.audioContext && state.audioContext.state === "suspended") {
    state.audioContext.resume().catch(() => {});
  }
  const ws = new WebSocket(getWsUrl());
  state.ws = ws;
  updateMobileChatControls();
  setStatus("Connecting to room...");
  ws.onopen = () => {
    sendMessage({
      type: "join",
      roomId,
      key,
      name: state.name,
      color: state.textColor,
      shape: state.avatarShape
    });
  };
  ws.onmessage = async (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "error") {
      log(msg.message);
      setStatus("Connection error");
      cleanupConnections();
      return;
    }
    if (msg.type === "file-error") {
      log(msg.message || "File rejected");
      return;
    }
    if (msg.type === "welcome") {
      state.clientId = msg.clientId;
      state.roomId = msg.roomId;
      state.key = key;
      state.participants.clear();
      msg.participants.forEach((p) => state.participants.set(p.id, p));
      renderParticipants();
      renderChatHistory(msg.messages);
      renderGlobalChatHistory(msg.globalMessages);
      updateRoomInfo();
      setStatus("Meeting active");
      muteButton.disabled = false;
      noiseButton.disabled = false;
      if (cameraButton) cameraButton.disabled = false;
      if (cameraSwitchButton) cameraSwitchButton.disabled = !isMobileCallMode;
      leaveButton.disabled = false;
      if (demoButton) demoButton.disabled = false;
      updateChatFileButton();
      updateMobileChatControls();
      log("Connected to room");
      if (state.muted) {
        toggleMute();
      }
      updateCameraSwitchButtonLabel();
      if (isMobileCallMode && getLocalVideoSourceCount("camera") === 0) {
        await startCamera();
      }
      msg.participants.filter((p) => p.id !== state.clientId).forEach(async (p) => {
        if (shouldCreateOffer(p.id)) {
          const peer = ensurePeer(p.id);
          const offer = await peer.pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
          await peer.pc.setLocalDescription(offer);
          sendMessage({ type: "signal", to: p.id, data: { type: "offer", offer } });
        }
      });
      return;
    }
    if (msg.type === "participant-joined") {
      state.participants.set(msg.participant.id, msg.participant);
      renderParticipants();
      if (shouldCreateOffer(msg.participant.id)) {
        const peer = ensurePeer(msg.participant.id);
        const offer = await peer.pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await peer.pc.setLocalDescription(offer);
        sendMessage({ type: "signal", to: msg.participant.id, data: { type: "offer", offer } });
      }
      return;
    }
    if (msg.type === "participant-left") {
      state.participants.delete(msg.id);
      clearOfferRetry(msg.id);
      const peer = state.peers.get(msg.id);
      if (peer) {
        peer.pc.close();
        state.peers.delete(msg.id);
      }
      state.localVideoSources.forEach((source) => {
        source?.senders?.delete(msg.id);
      });
      const audio = document.getElementById(`audio-${msg.id}`);
      if (audio) {
        cleanupAudioOutput(audio.id);
        audio.remove();
      }
      removeDemoSourcesByOwner(msg.id);
      renderParticipants();
      return;
    }
    if (msg.type === "participant-updated") {
      const existing = state.participants.get(msg.id);
      if (existing) {
        state.participants.set(msg.id, { ...existing, ...msg.patch });
        renderParticipants();
        if (msg.patch.name) {
          const ownerName = msg.patch.name;
          demoSources.forEach((demo, sourceId) => {
            if (demo?.ownerId === msg.id) {
              const label = composeRemoteVideoLabel(ownerName, demo.kind, demo.trackLabel);
              upsertDemoSource(sourceId, { ...demo, label });
            }
          });
        }
      }
      return;
    }
    if (msg.type === "chat") {
      if (state.chatHidden) setChatHidden(false);
      appendChatMessage(msg);
      return;
    }
    if (msg.type === "global-chat") {
      appendGlobalChatMessage(msg);
      return;
    }
    if (msg.type === "file") {
      if (state.chatHidden) setChatHidden(false);
      appendChatMessage(msg);
      return;
    }
    if (msg.type === "demo-start") {
      if (msg.from === state.clientId) return;
      if (msg.trackId && msg.label) {
        demoSources.forEach((source, sourceId) => {
          if (source?.ownerId === msg.from && source?.trackId === msg.trackId) {
            upsertDemoSource(sourceId, { ...source, label: String(msg.label) });
          }
        });
      }
      const participant = state.participants.get(msg.from);
      announceDemoStart(participant?.name || "Guest");
      if (demoModal && !demoModal.classList.contains("open")) {
        openDemoModal();
      }
      return;
    }
    if (msg.type === "demo-stop") {
      if (msg.from === state.clientId) return;
      let removed = false;
      if (msg.sourceId && demoSources.has(msg.sourceId)) {
        removeDemoSource(msg.sourceId);
        removed = true;
      }
      if (!removed && msg.trackId) {
        demoSources.forEach((source, sourceId) => {
          if (source?.ownerId === msg.from && source?.trackId === msg.trackId) {
            removeDemoSource(sourceId);
            removed = true;
          }
        });
      }
      if (!removed) {
        removeDemoSourcesByOwner(msg.from);
      }
      const participant = state.participants.get(msg.from);
      announceDemoStop(participant?.name || "Guest");
      return;
    }
    if (msg.type === "signal") {
      ensurePeer(msg.from);
      await handleSignal(msg.from, msg.data);
    }
  };
  ws.onclose = () => {
    setStatus("Disconnected");
    log("Connection closed");
    cleanupConnections();
  };
};

if (cmdArrow) {
  cmdArrow.addEventListener("click", () => {
    cmdInput?.focus();
    if (cmdMenu?.classList.contains("open")) {
      closeCommandMenu();
      resetCommandSuggestState();
      return;
    }
    refreshCommandSuggestions();
  });
  cmdArrow.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    cmdArrow.click();
  });
}

if (cmdForm) {
  cmdForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = cmdInput?.value?.trim() || "";
    if (!text) {
      return;
    }
    state.commandHistory.push(text);
    state.historyIndex = state.commandHistory.length;
    await handleCommand(text);
    if (cmdInput) {
      cmdInput.value = "";
    }
    closeCommandMenu();
  });
}

if (cmdInput) {
  cmdInput.addEventListener("input", () => {
    refreshCommandSuggestions();
    state.historyIndex = state.commandHistory.length;
    state.historyDraft = "";
  });

  cmdInput.addEventListener("focus", () => {
    if ((cmdInput.value || "").trim()) {
      refreshCommandSuggestions();
    }
  });

  cmdInput.addEventListener("blur", () => {
    setTimeout(() => {
      if (document.activeElement && cmdMenu?.contains(document.activeElement)) {
        return;
      }
      closeCommandMenu();
      resetCommandSuggestState();
    }, 100);
  });

  cmdInput.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      if (commandInputHasArgs(cmdInput.value)) {
        return;
      }
      const token = getCommandToken(cmdInput.value);
      const canCycleCurrentList =
        Boolean(cmdMenu?.classList.contains("open")) &&
        commandSuggestState.matches.length > 0 &&
        token.startsWith(commandSuggestState.seed);
      const matches = canCycleCurrentList
        ? commandSuggestState.matches
        : refreshCommandSuggestions({ keepIndex: false });
      if (!matches.length) {
        return;
      }
      event.preventDefault();
      const step = event.shiftKey ? -1 : 1;
      if (matches.length === 1) {
        commandSuggestState.index = 0;
        selectCommandSuggestion(matches[0]);
        closeCommandMenu();
        resetCommandSuggestState();
        return;
      }
      if (commandSuggestState.index < 0) {
        commandSuggestState.index = step > 0 ? 0 : matches.length - 1;
      } else {
        commandSuggestState.index =
          (commandSuggestState.index + step + matches.length) % matches.length;
      }
      const selected = matches[commandSuggestState.index];
      selectCommandSuggestion(selected, { addTrailingSpace: false });
      commandSuggestState.matches = matches;
      renderCommandMenu(matches, commandSuggestState.index);
      openCommandMenu();
      return;
    }

    if (event.key === "Escape") {
      if (cmdMenu?.classList.contains("open")) {
        event.preventDefault();
        closeCommandMenu();
        resetCommandSuggestState();
      }
      return;
    }

    if (event.key === "Enter" && cmdMenu?.classList.contains("open")) {
      if (commandSuggestState.index >= 0 && commandSuggestState.matches[commandSuggestState.index]) {
        event.preventDefault();
        selectCommandSuggestion(commandSuggestState.matches[commandSuggestState.index]);
        closeCommandMenu();
        resetCommandSuggestState();
      }
      return;
    }

    if (event.key === "ArrowUp") {
      if (cmdMenu?.classList.contains("open") && commandSuggestState.matches.length) {
        event.preventDefault();
        const total = commandSuggestState.matches.length;
        commandSuggestState.index =
          commandSuggestState.index < 0
            ? total - 1
            : (commandSuggestState.index - 1 + total) % total;
        selectCommandSuggestion(commandSuggestState.matches[commandSuggestState.index], {
          addTrailingSpace: false
        });
        renderCommandMenu(commandSuggestState.matches, commandSuggestState.index);
        return;
      }
      if (!state.commandHistory.length) {
        return;
      }
      event.preventDefault();
      if (state.historyIndex === state.commandHistory.length) {
        state.historyDraft = cmdInput.value;
      }
      state.historyIndex = Math.max(0, state.historyIndex - 1);
      cmdInput.value = state.commandHistory[state.historyIndex] || "";
      closeCommandMenu();
      resetCommandSuggestState();
    } else if (event.key === "ArrowDown") {
      if (cmdMenu?.classList.contains("open") && commandSuggestState.matches.length) {
        event.preventDefault();
        const total = commandSuggestState.matches.length;
        commandSuggestState.index =
          commandSuggestState.index < 0 ? 0 : (commandSuggestState.index + 1) % total;
        selectCommandSuggestion(commandSuggestState.matches[commandSuggestState.index], {
          addTrailingSpace: false
        });
        renderCommandMenu(commandSuggestState.matches, commandSuggestState.index);
        return;
      }
      if (!state.commandHistory.length) {
        return;
      }
      event.preventDefault();
      state.historyIndex = Math.min(state.commandHistory.length, state.historyIndex + 1);
      cmdInput.value =
        state.historyIndex < state.commandHistory.length
          ? state.commandHistory[state.historyIndex] || ""
          : state.historyDraft || "";
      if (state.historyIndex === state.commandHistory.length) {
        state.historyDraft = "";
      }
      closeCommandMenu();
      resetCommandSuggestState();
    }
  });
}

if (cmdMenu) {
  cmdMenu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCommandMenu();
      resetCommandSuggestState();
      cmdInput?.focus();
    }
  });
}

document.addEventListener("pointerdown", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  if (target === cmdInput || target === cmdArrow || target.closest("#cmd-form") || target.closest("#cmd-menu")) {
    return;
  }
  closeCommandMenu();
  resetCommandSuggestState();
});

if (chatToggleButton) {
  chatToggleButton.addEventListener("click", () => {
    toggleChatHidden();
  });
}

if (mobileChatForm) {
  mobileChatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = mobileChatInput?.value || "";
    const sent = sendChatMessage(text);
    if (sent && mobileChatInput) {
      mobileChatInput.value = "";
    }
  });
}

if (mobileChatFileButton) {
  mobileChatFileButton.addEventListener("click", () => {
    openChatFilePicker();
  });
}

if (chatFileButton) {
  chatFileButton.addEventListener("click", async () => {
    const file = chatFileInput?.files?.[0];
    if (!file) return;
    await sendFileMessage(file);
    if (chatFileInput) {
      chatFileInput.value = "";
    }
    updateChatFileButton();
  });
}

if (chatFileInput) {
  chatFileInput.addEventListener("change", () => {
    updateChatFileButton();
  });
}

if (globalChatForm) {
  globalChatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = globalChatInput?.value || "";
    const sent = sendGlobalChatMessage(text);
    if (sent && globalChatInput) {
      globalChatInput.value = "";
    }
  });
}

if (globalChatCloseButton) {
  globalChatCloseButton.addEventListener("click", () => {
    closeGlobalChatModal();
  });
}

if (globalChatToggleButton) {
  globalChatToggleButton.addEventListener("click", () => {
    toggleGlobalChatModal();
  });
}

if (globalChatModal) {
  globalChatModal.addEventListener("click", (event) => {
    if (event.target === globalChatModal) {
      closeGlobalChatModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  const questionHotkey = event.key === "?" || (event.code === "Slash" && event.shiftKey);
  if (questionHotkey && !isTypingTarget()) {
    event.preventDefault();
    toggleGlobalChatModal();
    return;
  }
  if (event.key === "Escape") {
    if (cmdMenu?.classList.contains("open")) {
      closeCommandMenu();
      cmdInput?.focus();
      return;
    }
    if (globalChatModal?.classList.contains("open")) {
      closeGlobalChatModal();
      return;
    }
    if (themeModal?.classList.contains("open")) {
      closeThemeModal();
    }
    if (demoModal?.classList.contains("open")) {
      closeDemoModal();
    }
  }
});

if (demoButton) {
  demoButton.addEventListener("click", async () => {
    if (!requireRoomConnection()) {
      return;
    }
    if (demoModal?.classList.contains("open")) {
      closeDemoModal();
      return;
    }
    if (demoSources.size === 0) {
      const started = await startScreenShare();
      if (!started) {
        return;
      }
    }
    openDemoModal();
  });
}

if (demoClose) {
  demoClose.addEventListener("click", () => {
    closeDemoModal();
  });
}

if (demoModal) {
  demoModal.addEventListener("click", (event) => {
    if (event.target === demoModal) {
      closeDemoModal();
    }
  });
}

if (policyAcceptButton) {
  policyAcceptButton.addEventListener("click", () => {
    writeStorage(STORAGE_KEYS.policyAccepted, "true");
    closePolicyModal();
  });
}

if (themeApplyButton) {
  themeApplyButton.addEventListener("click", () => {
    applyThemeFromInput();
  });
}

if (themeCancelButton) {
  themeCancelButton.addEventListener("click", () => {
    closeThemeModal();
  });
}

if (themeColorInput && themeTextInput) {
  themeColorInput.addEventListener("input", () => {
    themeTextInput.value = themeColorInput.value;
    if (themeError) {
      themeError.textContent = "";
    }
  });
}

if (themeTextInput) {
  themeTextInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyThemeFromInput();
    }
  });

  themeTextInput.addEventListener("input", () => {
    if (themeError) {
      themeError.textContent = "";
    }
  });
}

ensurePolicyAccepted();
updateModalOverlayState();
restoreCameraPreviewPosition();
bindCameraPreviewDrag();
bindCameraPreviewFullscreen();
restoreDemoWindowRect();
bindDemoWindowControls();
bindDemoFullscreenGesture();

if (demoUserSelect) {
  demoUserSelect.addEventListener("change", () => {
    const nextId = demoUserSelect.value;
    if (nextId) {
      setDemoImageSource(nextId);
    }
  });
}

if (demoSourcePrevButton) {
  demoSourcePrevButton.addEventListener("click", () => {
    selectDemoSourceByStep(-1);
  });
}

if (demoSourceNextButton) {
  demoSourceNextButton.addEventListener("click", () => {
    selectDemoSourceByStep(1);
  });
}

if (demoZoomOutButton) {
  demoZoomOutButton.addEventListener("click", () => {
    setDemoScale(demoState.scale - demoState.step);
  });
}

if (demoZoomInButton) {
  demoZoomInButton.addEventListener("click", () => {
    setDemoScale(demoState.scale + demoState.step);
  });
}

if (demoFitButton) {
  demoFitButton.addEventListener("click", () => {
    fitDemoToViewport();
  });
}

if (demoResetViewButton) {
  demoResetViewButton.addEventListener("click", () => {
    resetDemoView();
  });
}

if (demoFullscreenButton) {
  demoFullscreenButton.addEventListener("click", async () => {
    await toggleDemoFullscreen();
  });
}

if (demoShareToggleButton) {
  demoShareToggleButton.addEventListener("click", async () => {
    if (state.screenStream) {
      stopScreenShare();
      return;
    }
    const started = await startScreenShare();
    if (started && demoModal?.classList.contains("open")) {
      openDemoModal();
    }
  });
}

document.addEventListener("fullscreenchange", () => {
  if (cameraPreview) {
    cameraPreview.classList.toggle("is-fullscreen", isCameraPreviewFullscreen());
  }
  if (!isDemoFullscreen() && demoModal?.classList.contains("open") && !isMobileCallMode) {
    applyDemoWindowRect();
  }
  updateDemoControlState();
});

if (demoStage && !DEMO_COMPACT_WINDOW) {
  demoStage.addEventListener("wheel", (event) => {
    if (!demoState.sourceId) {
      return;
    }
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    setDemoScale(demoState.scale + direction * demoState.step);
    showDemoLoupe(event.clientX, event.clientY);
  });

  demoStage.addEventListener("pointerdown", (event) => {
    if (!demoState.sourceId) {
      return;
    }
    demoState.dragging = true;
    demoState.stagePointerId = event.pointerId;
    demoState.dragStartX = event.clientX;
    demoState.dragStartY = event.clientY;
    demoState.originX = demoState.offsetX;
    demoState.originY = demoState.offsetY;
    demoStage.classList.add("is-dragging");
    demoStage.setPointerCapture(event.pointerId);
  });

  demoStage.addEventListener("pointermove", (event) => {
    if (!demoState.dragging || demoState.stagePointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - demoState.dragStartX;
    const dy = event.clientY - demoState.dragStartY;
    demoState.offsetX = demoState.originX + dx;
    demoState.offsetY = demoState.originY + dy;
    setDemoViewMode("manual");
    updateDemoTransform();
  });

  demoStage.addEventListener("pointerup", (event) => {
    if (demoState.stagePointerId !== event.pointerId) {
      return;
    }
    demoState.dragging = false;
    demoState.stagePointerId = null;
    demoStage.classList.remove("is-dragging");
    demoStage.releasePointerCapture(event.pointerId);
  });

  demoStage.addEventListener("pointercancel", () => {
    demoState.dragging = false;
    demoState.stagePointerId = null;
    demoStage.classList.remove("is-dragging");
  });

  demoStage.addEventListener("pointerleave", () => {
    demoState.dragging = false;
    demoState.stagePointerId = null;
    demoStage.classList.remove("is-dragging");
  });

  demoStage.addEventListener("dblclick", () => {
    if (!demoState.sourceId) {
      return;
    }
    if (demoState.viewMode === "fit") {
      resetDemoView();
    } else {
      fitDemoToViewport();
    }
  });

  demoStage.addEventListener("keydown", (event) => {
    if (!demoModal?.classList.contains("open")) {
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      nudgeDemo(0, -20);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      nudgeDemo(0, 20);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      nudgeDemo(-20, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      nudgeDemo(20, 0);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setDemoScale(demoState.scale + demoState.step);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      setDemoScale(demoState.scale - demoState.step);
    } else if (event.key === "0") {
      event.preventDefault();
      fitDemoToViewport();
    } else if (event.key === "1") {
      event.preventDefault();
      resetDemoView();
    } else if (event.key === "[" || event.key === "PageUp") {
      event.preventDefault();
      selectDemoSourceByStep(-1);
    } else if (event.key === "]" || event.key === "PageDown") {
      event.preventDefault();
      selectDemoSourceByStep(1);
    } else if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      toggleDemoFullscreen();
    } else if (event.key === "s" || event.key === "S") {
      event.preventDefault();
      if (state.screenStream) {
        stopScreenShare();
      } else {
        startScreenShare().catch(() => {});
      }
    }
  });
}

window.addEventListener("resize", () => {
  if (!demoModal?.classList.contains("open")) {
    return;
  }
  if (isDemoFullscreen()) {
    updateDemoControlState();
    return;
  }
  if (!isMobileCallMode) {
    applyDemoWindowRect();
  }
  if (DEMO_COMPACT_WINDOW) {
    return;
  }
  if (demoState.viewMode === "fit") {
    fitDemoToViewport({ persistMode: false });
  } else {
    updateDemoTransform();
  }
});

muteButton.addEventListener("click", () => {
  if (!requireRoomConnection()) {
    return;
  }
  toggleMute();
});

noiseButton.addEventListener("click", () => {
  if (!requireRoomConnection()) {
    return;
  }
  toggleNoiseSuppression();
});

if (cameraButton) {
  cameraButton.addEventListener("click", async () => {
    if (!requireRoomConnection()) {
      return;
    }
    await toggleCamera();
  });
}

if (cameraSwitchButton) {
  cameraSwitchButton.addEventListener("click", async () => {
    if (!isMobileCallMode || !requireRoomConnection()) {
      return;
    }
    await switchCameraFacing();
  });
}

leaveButton.addEventListener("click", () => {
  leaveRoom();
});

if (helpButton) {
  helpButton.addEventListener("click", () => {
    try {
      sessionStorage.removeItem("telemost.returnTo");
    } catch {}
    location.href = "landing.html?help=1";
  });
}

setChatHidden(state.chatHidden);
chatPanelEl?.classList.add("is-empty");
initMobileTabs();
setMobileChatUnread(false);
setMobileConsoleUnread(false);
initMobileInputState();
updateMobileChatControls();

if (copyLinkButton) {
  copyLinkButton.addEventListener("click", async () => {
    const text = roomLinkEl?.textContent?.trim();
    if (!text || text === "—") {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      log("Ссылка скопирована");
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "true");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      log(ok ? "Ссылка скопирована" : "Не удалось скопировать ссылку");
    }
  });
}

updateDemoButtonLabel();
updateCameraButtonLabel();
updateCameraSwitchButtonLabel();

applyStoredSettings();

const hashData = parseHash();
if (hashData.roomId) {
  const safeKey = hashData.key || "";
  setRoomParams(hashData.roomId, safeKey);
  connectToRoom(hashData.roomId, safeKey);
  log(hashData.key ? "Auto-join by invite link" : "Auto-join by room id");
} else {
  log("Type help for command list");
}

if (!readStorage(STORAGE_KEYS.textColor)) {
  setTextColor(185, 251, 192);
}





