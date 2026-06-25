/**
 * Camera preview, capture and local video source management.
 * @module video
 */

import { state, STORAGE_KEYS, isMobileCallMode } from "./state.js";
import { log } from "./logger.js";
import { readStorage, writeStorage } from "./storage.js";
import { sendMessage } from "./ws.js";
import { sendOfferToPeer, tuneVideoSender, attachLocalSourceToPeer } from "./webrtc.js";
import { ensureProcessedStream } from "./audio.js";
import { formatMediaError, parseStoredNumber } from "./utils.js";
import {
  demoButton, cameraButton, cameraSwitchButton, cameraPreview,
  cameraPreviewHandle, cameraPreviewVideo, cameraPreviewResize
} from "./dom.js";
import {
  composeLocalVideoLabel, getLocalVideoSourcesByKind, getLocalVideoSourceCount,
  getLocalOwnerId, allocateLocalVideoSourceId, upsertDemoSource, removeDemoSource,
  removeDemoSourcesByOwner, updateDemoControlState
} from "./demo.js";

export const cameraPreviewState = {
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

export const clampCameraPreviewPosition = (x, y) => {
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

export const clampCameraPreviewWidth = (value) => {
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

export const applyCameraPreviewSize = () => {
  if (!cameraPreview) {
    return;
  }
  cameraPreview.style.width = `${Math.round(cameraPreviewState.width)}px`;
  if (isMobileCallMode) {
    return;
  }
  writeStorage(STORAGE_KEYS.cameraPreviewWidth, String(Math.round(cameraPreviewState.width)));
};

export const applyCameraPreviewPosition = () => {
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

export const restoreCameraPreviewPosition = () => {
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

export const placeCameraPreviewAtCorner = () => {
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

export const showCameraPreview = (stream) => {
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

export const hideCameraPreview = () => {
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

export const onCameraPreviewPointerDown = (event) => {
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

export const onCameraPreviewPointerMove = (event) => {
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

export const onCameraPreviewPointerUp = (event) => {
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

export const onCameraPreviewResizeDown = (event) => {
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

export const onCameraPreviewResizeMove = (event) => {
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

export const onCameraPreviewResizeUp = (event) => {
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

export const bindCameraPreviewDrag = () => {
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

export const bindCameraPreviewFullscreen = () => {
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


export const isCameraPreviewFullscreen = () => {
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


export const toggleCameraPreviewFullscreen = async () => {
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


export const refreshPrimaryMediaStreams = () => {
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

export const applyVideoTrackHints = (track, kind) => {
  if (!track) {
    return;
  }
  try {
    track.contentHint = kind === "screen" ? "detail" : "motion";
  } catch {}
};

export const addLocalVideoSource = (kind, stream, options = {}) => {
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

export const stopLocalVideoSource = (sourceId, options = {}) => {
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

export const stopLocalVideoSourcesByKind = (kind, options = {}) => {
  const ids = getLocalVideoSourcesByKind(kind).map((source) => source.id);
  if (!ids.length) {
    return false;
  }
  ids.forEach((id) => {
    stopLocalVideoSource(id, options);
  });
  return true;
};

export const updateDemoButtonLabel = () => {
  refreshPrimaryMediaStreams();
  const screenCount = getLocalVideoSourceCount("screen");
  if (!demoButton) {
    updateDemoControlState();
    return;
  }
  demoButton.textContent = screenCount > 0 ? "Demo (" + screenCount + ")" : "Demo";
  updateDemoControlState();
};

export const updateCameraButtonLabel = () => {
  refreshPrimaryMediaStreams();
  if (!cameraButton) {
    return;
  }
  const cameraCount = getLocalVideoSourceCount("camera");
  cameraButton.textContent = cameraCount > 0 ? "Camera: on (" + cameraCount + ")" : "Camera: off";
};

export const buildCameraVideoConstraints = (facing = state.cameraFacing, deviceId = "") => {
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

export const updateCameraSwitchButtonLabel = () => {
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

export const stopCamera = (silent = false) => {
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

export const requestCameraStream = async (facing = state.cameraFacing, deviceId = "") => {
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

export const startCamera = async (options = {}) => {
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

export const toggleCamera = async () => {
  if (getLocalVideoSourceCount("camera") > 0) {
    stopCamera();
    return;
  }
  await startCamera();
};

export const switchCameraFacing = async () => {
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

export const stopScreenShare = (silent = false) => {
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

export const startScreenShare = async () => {
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
