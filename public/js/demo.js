/**
 * Demo source registry and floating window manager.
 * @module demo
 */

import { state, STORAGE_KEYS, isMobileCallMode } from "./state.js";
import { log } from "./logger.js";
import { readStorage, writeStorage } from "./storage.js";
import { parseStoredNumber } from "./utils.js";
import { appendChatMessage } from "./chat.js";

const demoWindowsContainer = document.getElementById("demo-windows");

export const demoSources = new Map();
export const demoWindows = new Map();

const WINDOW_MIN_WIDTH = 240;
const WINDOW_MIN_HEIGHT = 160;
const WINDOW_MAX_WIDTH = 960;
const WINDOW_MARGIN = 12;

const formatZoomLabel = (value) => `${Math.round(value * 100)}%`;

export const getDemoSourceIds = () => Array.from(demoSources.keys());

export const getLocalOwnerId = () => state.clientId || "local";

export const getLocalVideoSourcesByKind = (kind) =>
  Array.from(state.localVideoSources.values()).filter((source) => source.kind === kind);

export const getLocalVideoSourceCount = (kind) => getLocalVideoSourcesByKind(kind).length;

export const allocateLocalVideoSourceId = (kind) => {
  state.videoSourceSeq += 1;
  return `${getLocalOwnerId()}:${kind}:${state.videoSourceSeq}`;
};

export const composeLocalVideoLabel = (kind, index) =>
  `${state.name} (you) - ${kind === "screen" ? "screen" : "camera"} ${index}`;

export const composeRemoteVideoLabel = (name, kind, trackLabel = "") => {
  const base = String(name || "Guest");
  const trackText = String(trackLabel || "").trim();
  if (trackText) {
    return `${base} - ${trackText}`;
  }
  return `${base} - ${kind === "screen" ? "screen" : "camera"}`;
};

export const announceDemoStart = (label) => {
  appendChatMessage({
    name: "Система",
    text: `${label} начал демонстрацию`,
    ts: Date.now()
  });
};

export const announceDemoStop = (label) => {
  appendChatMessage({
    name: "Система",
    text: `${label} завершил демонстрацию`,
    ts: Date.now()
  });
};

const clampWindowSize = (width, height) => {
  const margin = WINDOW_MARGIN;
  const maxWidthByViewport = Math.max(WINDOW_MIN_WIDTH, window.innerWidth - margin * 2);
  const maxHeightByViewport = Math.max(WINDOW_MIN_HEIGHT, window.innerHeight - margin * 2);
  return {
    width: Math.min(maxWidthByViewport, Math.max(WINDOW_MIN_WIDTH, width)),
    height: Math.min(maxHeightByViewport, Math.max(WINDOW_MIN_HEIGHT, height))
  };
};

const clampWindowPosition = (x, y, width, height) => {
  const margin = WINDOW_MARGIN;
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  const maxY = Math.max(margin, window.innerHeight - height - margin);
  return {
    x: Math.min(maxX, Math.max(margin, x)),
    y: Math.min(maxY, Math.max(margin, y))
  };
};

const computeCascadePosition = (index) => {
  const baseTop = 14;
  const baseRight = 14;
  const offset = 24;
  const top = baseTop + offset * index;
  const right = baseRight + offset * index;
  return {
    x: Math.max(WINDOW_MARGIN, window.innerWidth - WINDOW_MIN_WIDTH - right),
    y: Math.max(WINDOW_MARGIN, top)
  };
};

const bindWindowDrag = (win) => {
  const header = win.header;
  const content = win.content;
  const onPointerDown = (event) => {
    if (event.target.closest("button")) {
      return;
    }
    win.dragPointerId = event.pointerId;
    win.dragStartX = event.clientX;
    win.dragStartY = event.clientY;
    win.dragOriginX = win.x;
    win.dragOriginY = win.y;
    content.classList.add("is-dragging");
    header.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const onPointerMove = (event) => {
    if (win.dragPointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - win.dragStartX;
    const dy = event.clientY - win.dragStartY;
    win.x = win.dragOriginX + dx;
    win.y = win.dragOriginY + dy;
    applyWindowRect(win);
    event.preventDefault();
  };
  const onPointerUp = (event) => {
    if (win.dragPointerId !== event.pointerId) {
      return;
    }
    if (header.hasPointerCapture(event.pointerId)) {
      header.releasePointerCapture(event.pointerId);
    }
    win.dragPointerId = null;
    content.classList.remove("is-dragging");
  };
  header.addEventListener("pointerdown", onPointerDown);
  header.addEventListener("pointermove", onPointerMove);
  header.addEventListener("pointerup", onPointerUp);
  header.addEventListener("pointercancel", onPointerUp);
};

const bindWindowResize = (win) => {
  const handle = win.resize;
  const content = win.content;
  const onPointerDown = (event) => {
    win.resizePointerId = event.pointerId;
    win.resizeStartX = event.clientX;
    win.resizeStartY = event.clientY;
    const rect = content.getBoundingClientRect();
    win.resizeOriginWidth = rect.width;
    win.resizeOriginHeight = rect.height;
    win.width = rect.width;
    win.height = rect.height;
    content.classList.add("is-resizing");
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const onPointerMove = (event) => {
    if (win.resizePointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - win.resizeStartX;
    const dy = event.clientY - win.resizeStartY;
    win.width = win.resizeOriginWidth + dx;
    win.height = win.resizeOriginHeight + dy;
    applyWindowRect(win);
    event.preventDefault();
  };
  const onPointerUp = (event) => {
    if (win.resizePointerId !== event.pointerId) {
      return;
    }
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
    win.resizePointerId = null;
    content.classList.remove("is-resizing");
  };
  handle.addEventListener("pointerdown", onPointerDown);
  handle.addEventListener("pointermove", onPointerMove);
  handle.addEventListener("pointerup", onPointerUp);
  handle.addEventListener("pointercancel", onPointerUp);
};

const applyWindowRect = (win) => {
  const size = clampWindowSize(win.width, win.height);
  win.width = size.width;
  win.height = size.height;
  const pos = clampWindowPosition(win.x, win.y, win.width, win.height);
  win.x = pos.x;
  win.y = pos.y;
  win.content.style.left = "0";
  win.content.style.top = "0";
  win.content.style.right = "auto";
  win.content.style.width = `${Math.round(win.width)}px`;
  win.content.style.height = `${Math.round(win.height)}px`;
  win.content.style.transform = `translate3d(${Math.round(win.x)}px, ${Math.round(win.y)}px, 0)`;
};

const updateVideoTransform = (win) => {
  if (!win.video) {
    return;
  }
  win.video.style.transform = `translate(${win.offsetX}px, ${win.offsetY}px) scale(${win.scale})`;
};

const fitWindowVideo = (win) => {
  if (!win.video || win.video.videoWidth <= 0 || win.video.videoHeight <= 0) {
    return;
  }
  const rect = win.stage.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }
  const scale = Math.min(rect.width / win.video.videoWidth, rect.height / win.video.videoHeight);
  win.scale = Math.max(0.1, Math.min(4, Math.round(scale * 100) / 100));
  win.offsetX = 0;
  win.offsetY = 0;
  win.viewMode = "fit";
  updateVideoTransform(win);
};

const resetWindowView = (win) => {
  win.scale = 1;
  win.offsetX = 0;
  win.offsetY = 0;
  win.viewMode = "manual";
  updateVideoTransform(win);
};

const setWindowScale = (win, nextScale) => {
  win.scale = Math.max(0.1, Math.min(4, Math.round(nextScale * 10) / 10));
  win.viewMode = "manual";
  updateVideoTransform(win);
};

const nudgeWindow = (win, dx, dy) => {
  win.offsetX += dx;
  win.offsetY += dy;
  win.viewMode = "manual";
  updateVideoTransform(win);
};

const toggleWindowFullscreen = async (win) => {
  const content = win.content;
  try {
    if (document.fullscreenElement === content) {
      await document.exitFullscreen();
    } else {
      await content.requestFullscreen();
    }
  } catch {}
};

const createDemoWindow = (sourceId) => {
  if (demoWindows.has(sourceId)) {
    return demoWindows.get(sourceId);
  }
  const index = demoWindows.size;
  const pos = computeCascadePosition(index);
  const container = document.createElement("div");
  container.className = "demo-window open";
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-label", "Demo window");
  const content = document.createElement("div");
  content.className = "demo-window-content";
  const header = document.createElement("div");
  header.className = "demo-window-header";
  const title = document.createElement("div");
  title.className = "demo-window-title";
  title.textContent = "ДЕМО";
  const controls = document.createElement("div");
  controls.className = "demo-window-controls";
  const fitBtn = document.createElement("button");
  fitBtn.className = "demo-window-btn";
  fitBtn.type = "button";
  fitBtn.textContent = "fit";
  const fullscreenBtn = document.createElement("button");
  fullscreenBtn.className = "demo-window-btn";
  fullscreenBtn.type = "button";
  fullscreenBtn.textContent = "[]";
  const closeBtn = document.createElement("button");
  closeBtn.className = "demo-window-btn";
  closeBtn.type = "button";
  closeBtn.textContent = "×";
  controls.appendChild(fitBtn);
  controls.appendChild(fullscreenBtn);
  controls.appendChild(closeBtn);
  header.appendChild(title);
  header.appendChild(controls);
  const stage = document.createElement("div");
  stage.className = "demo-window-stage";
  stage.tabIndex = 0;
  const loader = document.createElement("div");
  loader.className = "demo-window-loader";
  loader.innerHTML = '<div class="demo-spinner"></div><div>Загрузка...</div>';
  const video = document.createElement("video");
  video.className = "demo-window-video";
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  stage.appendChild(loader);
  stage.appendChild(video);
  const resize = document.createElement("div");
  resize.className = "demo-window-resize";
  resize.setAttribute("aria-hidden", "true");
  content.appendChild(header);
  content.appendChild(stage);
  content.appendChild(resize);
  container.appendChild(content);
  demoWindowsContainer.appendChild(container);

  const win = {
    sourceId,
    container,
    content,
    header,
    title,
    stage,
    loader,
    video,
    resize,
    x: pos.x,
    y: pos.y,
    width: 360,
    height: 208,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    viewMode: "fit",
    dragPointerId: null,
    resizePointerId: null,
    dragStartX: 0,
    dragStartY: 0,
    dragOriginX: 0,
    dragOriginY: 0,
    resizeStartX: 0,
    resizeStartY: 0,
    resizeOriginWidth: 0,
    resizeOriginHeight: 0
  };

  applyWindowRect(win);
  bindWindowDrag(win);
  bindWindowResize(win);

  fitBtn.addEventListener("click", () => fitWindowVideo(win));
  fullscreenBtn.addEventListener("click", () => toggleWindowFullscreen(win));
  closeBtn.addEventListener("click", () => {
    const source = demoSources.get(sourceId);
    if (source?.isLocal) {
      stopLocalDemoSource(sourceId);
    } else {
      closeDemoWindow(sourceId);
    }
  });
  stage.addEventListener("dblclick", () => toggleWindowFullscreen(win));
  stage.addEventListener("wheel", (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setWindowScale(win, win.scale + delta);
  });
  stage.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      nudgeWindow(win, 0, -20);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      nudgeWindow(win, 0, 20);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      nudgeWindow(win, -20, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      nudgeWindow(win, 20, 0);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setWindowScale(win, win.scale + 0.1);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      setWindowScale(win, win.scale - 0.1);
    } else if (event.key === "0") {
      event.preventDefault();
      fitWindowVideo(win);
    } else if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      toggleWindowFullscreen(win);
    }
  });
  video.onloadeddata = () => {
    loader.classList.add("hidden");
    if (win.viewMode === "fit") {
      fitWindowVideo(win);
    }
    video.play().catch(() => {});
  };
  video.onerror = () => {
    loader.innerHTML = "<div>Не удалось загрузить поток</div>";
  };

  demoWindows.set(sourceId, win);
  return win;
};

const stopLocalDemoSource = (sourceId) => {
  const source = demoSources.get(sourceId);
  if (source?.isLocal) {
    import("./video.js").then(({ stopLocalVideoSource }) => {
      stopLocalVideoSource(sourceId, { notify: true, renegotiate: true });
    });
  }
};

export const openDemoWindow = (sourceId) => {
  const source = demoSources.get(sourceId);
  if (!source) {
    return null;
  }
  const win = createDemoWindow(sourceId);
  win.title.textContent = source.label || "ДЕМО";
  win.loader.classList.remove("hidden");
  win.video.srcObject = source.stream || null;
  win.container.classList.add("open");
  return win;
};

export const closeDemoWindow = (sourceId) => {
  const win = demoWindows.get(sourceId);
  if (!win) {
    return;
  }
  win.video.srcObject = null;
  win.video.pause();
  win.container.remove();
  demoWindows.delete(sourceId);
};

export const closeAllDemoWindows = () => {
  demoWindows.forEach((win, sourceId) => closeDemoWindow(sourceId));
};

export const updateDemoWindow = (sourceId, payload) => {
  const source = demoSources.get(sourceId);
  if (!source) {
    return;
  }
  const win = demoWindows.get(sourceId);
  if (win) {
    win.title.textContent = source.label || "ДЕМО";
    if (payload.stream) {
      win.video.srcObject = payload.stream;
      win.loader.classList.remove("hidden");
    }
  }
};

export const removeDemoSourcesByOwner = (ownerId, options = {}) => {
  const ids = [];
  demoSources.forEach((source, id) => {
    if (source?.ownerId === ownerId) {
      ids.push(id);
    }
  });
  ids.forEach((id) => removeDemoSource(id, options));
};

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
  closeDemoWindow(sourceId);
};

export const upsertDemoSource = (sourceId, payload, options = {}) => {
  const { autoSelect = "none", announce = false } = options;
  const prev = demoSources.get(sourceId);
  const next = { ...prev, ...payload };
  demoSources.set(sourceId, next);
  if (announce && !prev && next.label) {
    announceDemoStart(next.label);
  }
  const shouldOpen =
    autoSelect === "always" ||
    autoSelect === "if-empty" ||
    autoSelect === "if-empty-or-current" ||
    (autoSelect === "if-current" && demoWindows.has(sourceId));
  if (shouldOpen) {
    openDemoWindow(sourceId);
  } else {
    updateDemoWindow(sourceId, payload);
  }
};

export const showDemoPlaceholder = () => {};
export const updateDemoSelect = () => {};
export const updateDemoControlState = () => {};
export const updateDemoStatus = () => {};
export const setDemoViewMode = () => {};
export const updateDemoTransform = () => {};
export const setDemoScale = () => {};
export const nudgeDemo = () => {};
export const showDemoLoupe = () => {};
export const fitDemoToViewport = () => {};
export const resetDemoView = () => {};
export const selectDemoSourceByStep = () => {};
export const isDemoFullscreen = () => Boolean(document.fullscreenElement);
export const toggleDemoFullscreen = () => {};
export const setDemoImageSource = (sourceId) => openDemoWindow(sourceId);

export const demoState = {};
export const demoWindowState = {};

export const clampDemoWindowSize = clampWindowSize;
export const applyDemoWindowRect = () => {};
export const placeDemoWindowDefault = () => {};
export const restoreDemoWindowRect = () => {};
export const bindDemoWindowControls = () => {};
export const bindDemoFullscreenGesture = () => {};
export const openDemoModal = (sourceId) => openDemoWindow(sourceId);
export const closeDemoModal = () => closeAllDemoWindows();
