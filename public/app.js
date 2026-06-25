const statusEl = document.getElementById("status");
const participantsEl = document.getElementById("participants");
const roomIdEl = document.getElementById("room-id");
const roomLinkEl = document.getElementById("room-link");
const copyLinkButton = document.getElementById("btn-copy-link");
const logEl = document.getElementById("log");
const chatPanelEl = document.getElementById("chat-panel");
const chatLogEl = document.getElementById("chat-log");
const chatToggleButton = document.getElementById("btn-chat-toggle");
const chatFileInput = document.getElementById("chat-file-input");
const chatFileButton = document.getElementById("btn-chat-file");
const mobileChatForm = document.getElementById("mobile-chat-form");
const mobileChatInput = document.getElementById("mobile-chat-input");
const mobileChatSendButton = document.getElementById("mobile-chat-send");
const mobileChatFileButton = document.getElementById("mobile-chat-file");
const cmdForm = document.getElementById("cmd-form");
const cmdInput = document.getElementById("cmd-input");
const cmdArrow = document.querySelector(".cmd-arrow");
const cmdMenu = document.getElementById("cmd-menu");
const muteButton = document.getElementById("btn-mute");
const noiseButton = document.getElementById("btn-noise");
const cameraButton = document.getElementById("btn-camera");
const cameraSwitchButton = document.getElementById("btn-camera-switch");
const leaveButton = document.getElementById("btn-leave");
const helpButton = document.getElementById("btn-help");
const themeModal = document.getElementById("theme-modal");
const themeColorInput = document.getElementById("theme-color-input");
const themeTextInput = document.getElementById("theme-text-input");
const themeApplyButton = document.getElementById("theme-apply");
const themeCancelButton = document.getElementById("theme-cancel");
const themeError = document.getElementById("theme-error");
const globalChatModal = document.getElementById("global-chat-modal");
const globalChatLog = document.getElementById("global-chat-log");
const globalChatForm = document.getElementById("global-chat-form");
const globalChatInput = document.getElementById("global-chat-input");
const globalChatSendButton = document.getElementById("global-chat-send");
const globalChatCloseButton = document.getElementById("global-chat-close");
const globalChatToggleButton = document.getElementById("global-chat-toggle");
const demoButton = document.getElementById("btn-demo");
const demoModal = document.getElementById("demo-modal");
const demoModalContent = document.getElementById("demo-modal-content");
const demoHeader = demoModalContent?.querySelector(".demo-header") || null;
const demoStage = document.getElementById("demo-stage");
const demoViewport = document.getElementById("demo-viewport");
const demoVideo = document.getElementById("demo-video");
const demoLoader = document.getElementById("demo-loader");
const demoLoupe = document.getElementById("demo-loupe");
const demoResizeHandle = document.getElementById("demo-resize");
const demoClose = document.getElementById("demo-close");
const demoZoomIndicator = document.getElementById("demo-zoom-indicator");
const demoUserSelect = document.getElementById("demo-user-select");
const demoStatus = document.getElementById("demo-status");
const demoSourcePrevButton = document.getElementById("demo-source-prev");
const demoSourceNextButton = document.getElementById("demo-source-next");
const demoZoomOutButton = document.getElementById("demo-zoom-out");
const demoZoomInButton = document.getElementById("demo-zoom-in");
const demoFitButton = document.getElementById("demo-fit");
const demoResetViewButton = document.getElementById("demo-reset-view");
const demoFullscreenButton = document.getElementById("demo-fullscreen");
const demoShareToggleButton = document.getElementById("demo-share-toggle");
const policyModal = document.getElementById("policy-modal");
const policyAcceptButton = document.getElementById("policy-accept");
const modalOverlay = document.getElementById("modal-overlay");
const cameraPreview = document.getElementById("camera-preview");
const cameraPreviewHandle = document.getElementById("camera-preview-handle");
const cameraPreviewVideo = document.getElementById("camera-preview-video");
const cameraPreviewResize = document.getElementById("camera-preview-resize");
const mobilePanelsRoot = document.querySelector(".mobile-panels");
const mobileTabButtons = Array.from(document.querySelectorAll("[data-mobile-tab-btn]"));
const mobileTabPanes = Array.from(document.querySelectorAll("[data-mobile-tab-pane]"));
const mobileChatTabButton = document.querySelector('[data-mobile-tab-btn="chat"]');
const mobileConsoleTabButton = document.querySelector('[data-mobile-tab-btn="console"]');
const MOBILE_TAB_ORDER = ["room", "chat", "console"];

const STORAGE_KEYS = {
  name: "telemost.name",
  textColor: "telemost.textColor",
  avatarShape: "telemost.avatarShape",
  demoZoom: "telemost.demo.zoom",
  demoOffsetX: "telemost.demo.offsetX",
  demoOffsetY: "telemost.demo.offsetY",
  demoViewMode: "telemost.demo.viewMode",
  demoSourceId: "telemost.demo.sourceId",
  demoWindowX: "telemost.demo.window.x",
  demoWindowY: "telemost.demo.window.y",
  demoWindowW: "telemost.demo.window.w",
  demoWindowH: "telemost.demo.window.h",
  cameraPreviewX: "telemost.cameraPreview.x",
  cameraPreviewY: "telemost.cameraPreview.y",
  cameraPreviewWidth: "telemost.cameraPreview.width",
  mobileTab: "telemost.mobile.tab",
  policyAccepted: "telemost.policyAccepted"
};

const DEFAULT_ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];
const MAX_FILE_SIZE = 500 * 1024 * 1024;
const MAX_TEXT_PREVIEW = 1200;
const MAX_CHAT_HISTORY = 100;
const MAX_GLOBAL_CHAT_HISTORY = 200;
const OFFER_RETRY_DELAY_MS = 180;
const GLOBAL_CHAT_RETRY_MS = 1500;
const offerRetryTimers = new Map();

const readStorage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    return null;
  }
};

const pageParams = new URLSearchParams(location.search);
const isMobilePage = /(^|\/)mobile\.html$/i.test(location.pathname);
const isMobileCallMode = isMobilePage && pageParams.get("desktop") !== "1";
const DEMO_COMPACT_WINDOW = true;
if (isMobileCallMode) {
  document.body.classList.add("mobile-call-mode");
}

const isPolicyAccepted = () => readStorage(STORAGE_KEYS.policyAccepted) === "true";

const updateModalOverlayState = () => {
  if (!modalOverlay) {
    return;
  }
  const open =
    Boolean(themeModal?.classList.contains("open")) ||
    Boolean(globalChatModal?.classList.contains("open")) ||
    Boolean(demoModal?.classList.contains("open")) ||
    Boolean(policyModal?.classList.contains("open"));
  modalOverlay.classList.toggle("open", open);
  modalOverlay.setAttribute("aria-hidden", open ? "false" : "true");
};

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

const commandList = [
  "help",
  "create",
  "join",
  "id",
  "name",
  "mute",
  "unmute",
  "noise",
  "camera",
  "demo",
  "volume",
  "chat",
  "file",
  "chatpanel",
  "avatar",
  "theme",
  "leave"
];

const state = {
  ws: null,
  globalWs: null,
  roomId: null,
  key: null,
  clientId: null,
  name: "Р“РѕСЃС‚СЊ",
  participants: new Map(),
  peers: new Map(),
  userVolumes: new Map(),
  rawStream: null,
  processedStream: null,
  localStream: null,
  muted: true,
  neuralNoiseSuppression: true,
  noiseLevel: 100,
  active: false,
  textColor: "rgb(185, 251, 192)",
  avatarShape: "auto",
  chatHidden: false,
  commandHistory: [],
  historyIndex: 0,
  historyDraft: "",
  audioContext: null,
  workletReady: false,
  remoteAudioOutputs: new Map(),
  processingNode: null,
  processingSource: null,
  processingDestination: null,
  analyser: null,
  meterSource: null,
  analyserStreamId: null,
  activityTimer: null,
  cameraStream: null,
  cameraSenders: new Map(),
  cameraFacing: "user",
  screenStream: null,
  screenSenders: new Map(),
  localVideoSources: new Map(),
  videoSourceSeq: 0,
  primaryCameraSourceId: null,
  mobileTab: "room",
  mobileChatUnread: false,
  mobileConsoleUnread: false,
  iceServers: [],
  globalChatMessages: [],
  globalChatRetryTimer: null
};

if (isMobileCallMode) {
  state.chatHidden = false;
}

const clearOfferRetry = (peerId) => {
  const timer = offerRetryTimers.get(peerId);
  if (!timer) {
    return;
  }
  clearTimeout(timer);
  offerRetryTimers.delete(peerId);
};

const clearAllOfferRetries = () => {
  offerRetryTimers.forEach((timer) => clearTimeout(timer));
  offerRetryTimers.clear();
};

const formatMediaError = (error, fallback) => {
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

const log = (text) => {
  const line = document.createElement("div");
  line.textContent = text;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
  if (isMobileCallMode && state.mobileTab !== "console") {
    setMobileConsoleUnread(true);
  }
};

const formatChatTime = (value) => {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const isTypingTarget = (target = document.activeElement) =>
  target instanceof HTMLElement &&
  target.matches("input, textarea, select, [contenteditable='true']");

const formatFileSize = (size) => {
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

const normalizeFilename = (name) => {
  const trimmed = String(name || "").trim();
  return trimmed || "file";
};

const getFileExtension = (name) => {
  const safeName = normalizeFilename(name);
  const index = safeName.lastIndexOf(".");
  return index !== -1 ? safeName.slice(index + 1).toLowerCase() : "";
};

const isTextFile = (file) => {
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

const isImageFile = (file) => file?.type?.startsWith("image/");

const clampTextPreview = (value) => {
  if (!value) {
    return "";
  }
  if (value.length <= MAX_TEXT_PREVIEW) {
    return value;
  }
  return `${value.slice(0, MAX_TEXT_PREVIEW)}вЂ¦`;
};

const createChatMessageElement = ({ type, name, text, ts, from, file }) => {
  const line = document.createElement("div");
  line.className = "chat-message";
  const participant = from ? state.participants.get(from) : null;
  const displayName = name || participant?.name || "Р“РѕСЃС‚СЊ";
  const timeLabel = ts ? `[${formatChatTime(ts)}] ` : "";
  const header = document.createElement("div");
  header.className = "chat-message-header";
  const timeEl = document.createElement("span");
  timeEl.textContent = timeLabel;
  const authorEl = document.createElement("span");
  authorEl.className = "chat-message-author";
  authorEl.textContent = displayName;
  header.appendChild(timeEl);
  header.appendChild(authorEl);
  line.appendChild(header);

  if (type === "file" && file) {
    const meta = document.createElement("div");
    meta.className = "chat-file-meta";
    const nameEl = document.createElement("span");
    nameEl.textContent = normalizeFilename(file.name);
    const sizeEl = document.createElement("span");
    sizeEl.textContent = formatFileSize(file.size);
    meta.appendChild(nameEl);
    if (file.size) {
      meta.appendChild(sizeEl);
    }
    const fileUrl = file.url || file.dataUrl;
    if (fileUrl) {
      const link = document.createElement("a");
      link.className = "chat-file-link";
      link.href = fileUrl;
      link.download = normalizeFilename(file.name);
      link.textContent = "РЎРєР°С‡Р°С‚СЊ";
      meta.appendChild(link);
    }
    line.appendChild(meta);
    if (file.isImage && fileUrl) {
      const img = document.createElement("img");
      img.className = "chat-image-preview";
      img.src = fileUrl;
      img.alt = normalizeFilename(file.name);
      line.appendChild(img);
    }
    if (file.textPreview) {
      const code = document.createElement("div");
      code.className = "chat-code-preview";
      code.textContent = file.textPreview;
      line.appendChild(code);
    }
    return line;
  }

  const body = document.createElement("div");
  body.className = "chat-message-text";
  body.textContent = text || "";
  line.appendChild(body);
  return line;
};

const appendChatMessage = (message, options = {}) => {
  if (!chatLogEl) {
    return;
  }
  const { markUnread = true } = options;
  const line = createChatMessageElement(message);
  chatLogEl.appendChild(line);
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
  chatPanelEl?.classList.remove("is-empty");
  if (markUnread && isMobileCallMode && state.mobileTab !== "chat") {
    setMobileChatUnread(true);
  }
};

const renderChatHistory = (messages) => {
  if (!chatLogEl) {
    return;
  }
  chatLogEl.innerHTML = "";
  chatPanelEl?.classList.add("is-empty");
  if (!Array.isArray(messages)) {
    return;
  }
  messages.slice(-MAX_CHAT_HISTORY).forEach((message) => {
    appendChatMessage(message, { markUnread: false });
  });
};

const createGlobalChatMessageElement = (message) => {
  const line = createChatMessageElement(message);
  line.classList.add("global-chat-message");
  const header = line.querySelector(".chat-message-header");
  if (header) {
    const roomBadge = document.createElement("span");
    roomBadge.className = "global-chat-room";
    const roomName = String(message?.roomName || "").trim();
    const roomId = String(message?.roomId || "").trim();
    roomBadge.textContent = roomName ? roomName : roomId ? `#${roomId}` : "global";
    header.appendChild(roomBadge);
  }
  return line;
};

const appendGlobalChatMessage = (message) => {
  if (!globalChatLog) {
    return;
  }
  state.globalChatMessages.push(message);
  if (state.globalChatMessages.length > MAX_GLOBAL_CHAT_HISTORY) {
    state.globalChatMessages.splice(0, state.globalChatMessages.length - MAX_GLOBAL_CHAT_HISTORY);
  }
  const line = createGlobalChatMessageElement(message);
  globalChatLog.appendChild(line);
  while (globalChatLog.childNodes.length > MAX_GLOBAL_CHAT_HISTORY) {
    globalChatLog.removeChild(globalChatLog.firstChild);
  }
  globalChatLog.scrollTop = globalChatLog.scrollHeight;
};

const renderGlobalChatHistory = (messages) => {
  if (!globalChatLog) {
    return;
  }
  globalChatLog.innerHTML = "";
  state.globalChatMessages = [];
  if (!Array.isArray(messages)) {
    return;
  }
  messages.slice(-MAX_GLOBAL_CHAT_HISTORY).forEach((message) => {
    appendGlobalChatMessage(message);
  });
};

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

const setChatHidden = (hidden) => {
  const effectiveHidden = isMobileCallMode ? false : hidden;
  state.chatHidden = effectiveHidden;
  if (chatLogEl) {
    chatLogEl.classList.toggle("hidden", effectiveHidden);
  }
  if (chatPanelEl) {
    chatPanelEl.classList.toggle("hidden", effectiveHidden);
    chatPanelEl.setAttribute("aria-expanded", effectiveHidden ? "false" : "true");
  }
};

const toggleChatHidden = () => {
  setChatHidden(!state.chatHidden);
};

const setMobileChatUnread = (unread) => {
  state.mobileChatUnread = unread;
  if (mobileChatTabButton) {
    mobileChatTabButton.classList.toggle("has-unread", unread);
  }
};

const setMobileConsoleUnread = (unread) => {
  state.mobileConsoleUnread = unread;
  if (mobileConsoleTabButton) {
    mobileConsoleTabButton.classList.toggle("has-unread", unread);
  }
};

const updateMobileKeyboardState = () => {
  if (!isMobileCallMode) {
    return;
  }
  const active = document.activeElement;
  const focusedField =
    active instanceof HTMLElement &&
    (active.matches("input, textarea, [contenteditable='true']") || active === cmdInput);
  document.body.classList.toggle("mobile-keyboard-open", focusedField);
};

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

const setMobileTab = (nextTab) => {
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

const initMobileTabs = () => {
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

const initMobileInputState = () => {
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

const setStatus = (text) => {
  statusEl.textContent = text;
};

const clampRgb = (value) => Math.min(255, Math.max(0, value));

const mixChannel = (value, target, amount) =>
  Math.round(value * (1 - amount) + target * amount);

const rgbToHex = (r, g, b) =>
  `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;

const parseHexColor = (value) => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("#")) {
    return null;
  }
  if (trimmed.length === 4) {
    const r = parseInt(trimmed[1] + trimmed[1], 16);
    const g = parseInt(trimmed[2] + trimmed[2], 16);
    const b = parseInt(trimmed[3] + trimmed[3], 16);
    if ([r, g, b].some((value) => Number.isNaN(value))) {
      return null;
    }
    return { r, g, b };
  }
  if (trimmed.length === 7) {
    const r = parseInt(trimmed.slice(1, 3), 16);
    const g = parseInt(trimmed.slice(3, 5), 16);
    const b = parseInt(trimmed.slice(5, 7), 16);
    if ([r, g, b].some((value) => Number.isNaN(value))) {
      return null;
    }
    return { r, g, b };
  }
  return null;
};

const parseRgbColor = (value) => {
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

const parseThemeColor = (value) => parseHexColor(value) || parseRgbColor(value);

const demoSources = new Map();

const avatarShapeOptions = {
  auto: "",
  square: "shape-square",
  circle: "shape-circle",
  diamond: "shape-diamond",
  hex: "shape-hex",
  triangle: "shape-triangle"
};

const normalizeAvatarShape = (value) => {
  const key = String(value || "").trim().toLowerCase();
  if (!key) {
    return null;
  }
  return Object.prototype.hasOwnProperty.call(avatarShapeOptions, key) ? key : null;
};

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

const openThemeModal = () => {
  if (!themeModal || !themeColorInput || !themeTextInput || !themeError) {
    log("РћРєРЅРѕ С‚РµРјС‹ РЅРµРґРѕСЃС‚СѓРїРЅРѕ");
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
      "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ С†РІРµС‚. Р¤РѕСЂРјР°С‚: #RGB, #RRGGBB РёР»Рё rgb(r, g, b).";
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

const parseStoredNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

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
  cameraPreview.style.left = `${cameraPreviewState.x}px`;
  cameraPreview.style.top = `${cameraPreviewState.y}px`;
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
  demoModalContent.style.left = `${Math.round(demoWindowState.x)}px`;
  demoModalContent.style.top = `${Math.round(demoWindowState.y)}px`;
  demoModalContent.style.width = `${Math.round(demoWindowState.width)}px`;
  demoModalContent.style.height = `${Math.round(demoWindowState.height)}px`;
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
    demoStatus.textContent = "РќРµС‚ Р°РєС‚РёРІРЅРѕР№ РґРµРјРѕРЅСЃС‚СЂР°С†РёРё СЌРєСЂР°РЅР°";
    return;
  }
  const modeLabel = demoState.viewMode === "fit" ? "РїРѕ СЂР°Р·РјРµСЂСѓ" : "СЂСѓС‡РЅРѕР№";
  const shareLabel = source.isLocal ? "РІР°С€ РїРѕРєР°Р·" : "РїСЂРѕСЃРјРѕС‚СЂ";
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
    demoFullscreenButton.textContent = activeFullscreen ? "Р’С‹Р№С‚Рё РёР· РїРѕР»РЅРѕСЌРєСЂР°РЅРЅРѕРіРѕ" : "РќР° РІРµСЃСЊ СЌРєСЂР°РЅ";
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

const showDemoPlaceholder = (text = "РќРµС‚ Р°РєС‚РёРІРЅРѕР№ РґРµРјРѕРЅСЃС‚СЂР°С†РёРё СЌРєСЂР°РЅР°") => {
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
    option.textContent = "РќРµС‚ РёСЃС‚РѕС‡РЅРёРєРѕРІ";
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
    name: "РЎРёСЃС‚РµРјР°",
    text: `${label} РЅР°С‡Р°Р» РґРµРјРѕРЅСЃС‚СЂР°С†РёСЋ`,
    ts: Date.now()
  });
};

const announceDemoStop = (label) => {
  appendChatMessage({
    name: "РЎРёСЃС‚РµРјР°",
    text: `${label} Р·Р°РІРµСЂС€РёР» РґРµРјРѕРЅСЃС‚СЂР°С†РёСЋ`,
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
    announceDemoStart(next.label || "Р“РѕСЃС‚СЊ");
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
    const label = source.label ? String(source.label) : "РёСЃС‚РѕС‡РЅРёРє";
    demoLoader.innerHTML = `<div class="demo-spinner"></div><div>Р—Р°РіСЂСѓР·РєР°: ${label}</div>`;
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
    showDemoPlaceholder("РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РїРѕС‚РѕРє");
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
    log("Р”РµРјРѕ РѕРєРЅРѕ РЅРµРґРѕСЃС‚СѓРїРЅРѕ");
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
  roomIdEl.textContent = state.roomId || "вЂ”";
  if (!state.roomId) {
    roomLinkEl.textContent = "вЂ”";
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

const avatarShapes = Object.values(avatarShapeOptions).filter(Boolean);

const hashString = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const getAvatarShapeClass = (participant) => {
  const preferred = normalizeAvatarShape(participant.shape);
  if (preferred && preferred !== "auto") {
    return avatarShapeOptions[preferred];
  }
  if (!avatarShapes.length) {
    return "";
  }
  const seed = participant.id || participant.name || "";
  const index = hashString(seed) % avatarShapes.length;
  return avatarShapes[index];
};

const renderParticipants = () => {
  participantsEl.innerHTML = "";
  state.participants.forEach((participant) => {
    const li = document.createElement("li");
    const avatar = document.createElement("span");
    avatar.className = `participant-avatar ${getAvatarShapeClass(participant)}`;
    avatar.style.backgroundColor = participant.color || state.textColor;
    li.appendChild(avatar);
    const name = document.createElement("span");
    name.textContent =
      participant.id === state.clientId
        ? `${participant.name} (\u0432\u044b)`
        : participant.name;
    li.appendChild(name);

    const mute = document.createElement("span");
    mute.className = `badge ${participant.muted ? "muted" : ""}`;
    mute.textContent = participant.muted ? "mute" : "live";
    li.appendChild(mute);

    const activity = document.createElement("span");
    activity.className = `badge ${participant.active ? "active" : ""}`;
    activity.textContent = participant.active ? "voice" : "idle";
    li.appendChild(activity);

    participantsEl.appendChild(li);
  });
};

const getAudioElement = (participantId) =>
  document.getElementById(`audio-${participantId}`);

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

const setParticipantVolume = (participantId, level) => {
  const safeLevel = clampVolume(level);
  state.userVolumes.set(participantId, safeLevel);
  const audio = getAudioElement(participantId);
  if (audio) {
    applyVolumeToElement(audio, safeLevel);
  }
};

const parseHash = () => {
  const params = new URLSearchParams(location.hash.slice(1));
  return {
    roomId: params.get("room"),
    key: params.get("key")
  };
};

let iceServersPromise = null;

const ensureIceServers = async () => {
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

const setRoomParams = (roomId, key) => {
  state.roomId = roomId;
  state.key = key;
  location.hash = key ? `room=${roomId}&key=${key}` : `room=${roomId}`;
  updateRoomInfo();
};

const fetchCreateRoom = async (name) => {
  const url = new URL("/api/create", location.origin);
  if (name) {
    url.searchParams.set("name", name);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    if (res.status === 409) {
      throw new Error("room-name-taken");
    }
    throw new Error("РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ РєРѕРјРЅР°С‚Сѓ");
  }
  return res.json();
};

const resolveRoomName = async (name) => {
  const url = new URL("/api/resolve", location.origin);
  url.searchParams.set("name", name);
  const res = await fetch(url.toString());
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  return data?.roomId || null;
};

const looksLikeRoomId = (value) => /^[A-Za-z0-9-]{8}$/.test(value);

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
    log("РЁСѓРјРѕРїРѕРґР°РІР»РµРЅРёРµ РЅРµРґРѕСЃС‚СѓРїРЅРѕ, РёСЃРїРѕР»СЊР·СѓРµРј РѕР±С‹С‡РЅС‹Р№ Р·РІСѓРє");
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

const updateLocalParticipant = (patch) => {
  const me = state.participants.get(state.clientId);
  if (me) {
    state.participants.set(state.clientId, { ...me, ...patch });
    renderParticipants();
  }
};

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
      ? "РќРµР№СЂРѕ-С€СѓРјРѕРїРѕРґР°РІР»РµРЅРёРµ: РІРєР»"
      : "РќРµР№СЂРѕ-С€СѓРјРѕРїРѕРґР°РІР»РµРЅРёРµ: РІС‹РєР»";
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
    log("РќРµ СѓРґР°Р»РѕСЃСЊ РІРєР»СЋС‡РёС‚СЊ С€СѓРјРѕРїРѕРґР°РІР»РµРЅРёРµ");
  }
  noiseButton.textContent = state.neuralNoiseSuppression
    ? "РЁСѓРјРѕРїРѕРґР°РІР»РµРЅРёРµ: РІРєР»"
    : "РЁСѓРјРѕРїРѕРґР°РІР»РµРЅРёРµ: РІС‹РєР»";
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
    let msg = null;
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

const sendChatMessage = (text) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (!isRoomConnected()) {
    requireRoomConnection();
    return false;
  }
  sendMessage({ type: "chat", text: trimmed });
  return true;
};

const openChatFilePicker = () => {
  if (!chatFileInput) {
    log("РћС‚РїСЂР°РІРєР° С„Р°Р№Р»РѕРІ РЅРµРґРѕСЃС‚СѓРїРЅР°");
    return;
  }
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    log("РЎРЅР°С‡Р°Р»Р° РїРѕРґРєР»СЋС‡РёС‚РµСЃСЊ Рє РєРѕРјРЅР°С‚Рµ");
    return;
  }
  chatFileInput.click();
};

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const readFileSliceAsText = (file, limit) => {
  const slice = file.slice(0, limit);
  return readFileAsText(slice);
};

const updateChatFileButton = () => {
  if (!chatFileButton) {
    return;
  }
  const hasFile = Boolean(chatFileInput?.files?.length);
  const canSend = state.ws && state.ws.readyState === WebSocket.OPEN && hasFile;
  chatFileButton.disabled = !canSend;
};

const updateMobileChatControls = () => {
  const connected = Boolean(state.ws && state.ws.readyState === WebSocket.OPEN);
  if (mobileChatInput) {
    mobileChatInput.disabled = false;
    mobileChatInput.placeholder = connected ? "Message..." : "Message... (connect to room first)";
  }
  if (mobileChatSendButton) {
    mobileChatSendButton.disabled = false;
  }
  if (mobileChatFileButton) {
    mobileChatFileButton.disabled = !connected;
  }
  if (globalChatInput) {
    globalChatInput.disabled = false;
  }
  if (globalChatSendButton) {
    globalChatSendButton.disabled = false;
  }
};

const sendFileMessage = async (file) => {
  if (!file) {
    log("Р¤Р°Р№Р» РЅРµ РІС‹Р±СЂР°РЅ");
    return;
  }
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    log("РЎРЅР°С‡Р°Р»Р° РїРѕРґРєР»СЋС‡РёС‚РµСЃСЊ Рє РєРѕРјРЅР°С‚Рµ");
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    log(`Р¤Р°Р№Р» СЃР»РёС€РєРѕРј Р±РѕР»СЊС€РѕР№ (РјР°РєСЃ ${formatFileSize(MAX_FILE_SIZE)})`);
    return;
  }
  let textPreview = "";
  try {
    if (isTextFile(file)) {
      const rawText = await readFileSliceAsText(file, MAX_TEXT_PREVIEW * 4);
      textPreview = clampTextPreview(String(rawText || ""));
    }
  } catch {
    log("РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ С„Р°Р№Р»");
    return;
  }
  let upload;
  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "x-room-id": state.roomId || "",
        "x-room-key": state.key || "",
        "x-file-name": normalizeFilename(file.name),
        "x-file-type": file.type || "",
        "x-file-size": String(file.size)
      },
      body: file
    });
    if (!response.ok) {
      log("РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ С„Р°Р№Р»");
      return;
    }
    upload = await response.json();
  } catch {
    log("РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ С„Р°Р№Р»");
    return;
  }
  if (!upload?.fileId || !upload?.url) {
    log("РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ С„Р°Р№Р»");
    return;
  }
  sendMessage({
    type: "file",
    file: {
      name: normalizeFilename(file.name),
      size: file.size,
      mime: file.type || "",
      fileId: upload.fileId,
      url: upload.url,
      textPreview,
      isImage: isImageFile(file)
    }
  });
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
  muteButton.textContent = "РњРёРєСЂРѕС„РѕРЅ: РІС‹РєР»";
  muteButton.disabled = false;
  noiseButton.textContent = "РЁСѓРјРѕРїРѕРґР°РІР»РµРЅРёРµ: РІРєР»";
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

const shouldCreateOffer = (peerId) => {
  if (!state.clientId) {
    return false;
  }
  return state.clientId > peerId;
};

const sendOfferToPeer = async (peerId) => {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    clearOfferRetry(peerId);
    return;
  }
  const peer = state.peers.get(peerId);
  if (!peer) {
    clearOfferRetry(peerId);
    return;
  }
  const pc = peer.pc;
  if (peer.makingOffer) {
    return;
  }
  if (pc.signalingState !== "stable") {
    if (!offerRetryTimers.has(peerId)) {
      const timer = setTimeout(() => {
        offerRetryTimers.delete(peerId);
        sendOfferToPeer(peerId).catch(() => {});
      }, OFFER_RETRY_DELAY_MS);
      offerRetryTimers.set(peerId, timer);
    }
    return;
  }
  clearOfferRetry(peerId);
  peer.makingOffer = true;
  try {
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await pc.setLocalDescription(offer);
    sendMessage({
      type: "signal",
      to: peerId,
      data: { type: "offer", offer }
    });
  } finally {
    peer.makingOffer = false;
    if (pc.signalingState !== "stable") {
      if (!offerRetryTimers.has(peerId)) {
        const timer = setTimeout(() => {
          offerRetryTimers.delete(peerId);
          sendOfferToPeer(peerId).catch(() => {});
        }, OFFER_RETRY_DELAY_MS);
        offerRetryTimers.set(peerId, timer);
      }
    }
  }
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

const handleSignal = async (from, data) => {
  const peer = ensurePeer(from);
  const pc = peer.pc;
  if (data.type === "offer") {
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendMessage({ type: "signal", to: from, data: { type: "answer", answer } });
    if (peer.pendingCandidates.length) {
      const pending = [...peer.pendingCandidates];
      peer.pendingCandidates.length = 0;
      for (const candidate of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }
  } else if (data.type === "answer") {
    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    if (peer.pendingCandidates.length) {
      const pending = [...peer.pendingCandidates];
      peer.pendingCandidates.length = 0;
      for (const candidate of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }
  } else if (data.type === "ice" && data.candidate) {
    if (pc.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } else {
      peer.pendingCandidates.push(data.candidate);
    }
  }
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

const leaveRoom = () => {
  if (state.ws) {
    try {
      state.ws.close();
    } catch {}
  } else {
    cleanupConnections();
  }
};

const closeCommandMenu = () => {
  if (!cmdMenu) {
    return;
  }
  cmdMenu.classList.remove("open");
  cmdMenu.setAttribute("aria-hidden", "true");
  cmdMenu.innerHTML = "";
};

const openCommandMenu = () => {
  if (!cmdMenu) {
    return;
  }
  cmdMenu.classList.add("open");
  cmdMenu.setAttribute("aria-hidden", "false");
};

const getCommandToken = (value) => {
  const raw = String(value || "");
  const trimmed = raw.trimStart();
  if (!trimmed) {
    return "";
  }
  const firstSpaceIndex = trimmed.search(/\s/);
  return (firstSpaceIndex === -1 ? trimmed : trimmed.slice(0, firstSpaceIndex)).toLowerCase();
};

const commandInputHasArgs = (value) => /\s/.test(String(value || "").trimStart());

const findCommandMatches = (query) => {
  if (!query) {
    return [...commandList];
  }
  return commandList.filter((command) => command.startsWith(query));
};

const commandSuggestState = {
  seed: "",
  matches: [],
  index: -1
};

const selectCommandSuggestion = (command, options = {}) => {
  if (!cmdInput) {
    return;
  }
  const addTrailingSpace = options.addTrailingSpace !== false;
  const inputText = String(cmdInput.value || "");
  const leadingWhitespace = (inputText.match(/^\s*/) || [""])[0];
  const trimmed = inputText.trimStart();
  const firstSpaceIndex = trimmed.search(/\s/);
  const args = firstSpaceIndex === -1 ? "" : trimmed.slice(firstSpaceIndex).trimStart();
  const suffix = args ? ` ${args}` : addTrailingSpace ? " " : "";
  cmdInput.value = `${leadingWhitespace}${command}${suffix}`;
  cmdInput.setSelectionRange(cmdInput.value.length, cmdInput.value.length);
};

const renderCommandMenu = (matches, activeIndex = -1) => {
  if (!cmdMenu) {
    return;
  }
  cmdMenu.innerHTML = "";
  matches.forEach((command, index) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "cmd-menu-item";
    option.textContent = command;
    if (index === activeIndex) {
      option.classList.add("is-active");
      option.setAttribute("aria-selected", "true");
    } else {
      option.setAttribute("aria-selected", "false");
    }
    option.addEventListener("mouseenter", () => {
      commandSuggestState.index = index;
      renderCommandMenu(commandSuggestState.matches, commandSuggestState.index);
      openCommandMenu();
    });
    option.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    option.addEventListener("click", () => {
      selectCommandSuggestion(command);
      commandSuggestState.index = index;
      closeCommandMenu();
      cmdInput?.focus();
    });
    cmdMenu.appendChild(option);
  });
};

const resetCommandSuggestState = () => {
  commandSuggestState.seed = "";
  commandSuggestState.matches = [];
  commandSuggestState.index = -1;
};

const refreshCommandSuggestions = (options = {}) => {
  if (!cmdInput || !cmdMenu) {
    return [];
  }
  const keepIndex = options.keepIndex === true;
  const value = cmdInput.value || "";
  if (commandInputHasArgs(value)) {
    closeCommandMenu();
    resetCommandSuggestState();
    return [];
  }
  const query = getCommandToken(value);
  const matches = findCommandMatches(query);
  if (!matches.length) {
    closeCommandMenu();
    resetCommandSuggestState();
    return [];
  }
  const nextIndex =
    keepIndex && commandSuggestState.index >= 0 && commandSuggestState.index < matches.length
      ? commandSuggestState.index
      : -1;
  commandSuggestState.seed = query;
  commandSuggestState.matches = matches;
  commandSuggestState.index = nextIndex;
  renderCommandMenu(matches, nextIndex);
  openCommandMenu();
  return matches;
};

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
    let roomId = "";
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

const connectToRoom = async (roomId, key) => {
  if (state.ws) {
    log("Already connected");
    return;
  }
  await ensureIceServers();
  try {
    await ensureLocalStream();
  } catch (err) {
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
    if (!text || text === "вЂ”") {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      log("РЎСЃС‹Р»РєР° СЃРєРѕРїРёСЂРѕРІР°РЅР°");
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
      log(ok ? "РЎСЃС‹Р»РєР° СЃРєРѕРїРёСЂРѕРІР°РЅР°" : "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРєРѕРїРёСЂРѕРІР°С‚СЊ СЃСЃС‹Р»РєСѓ");
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



