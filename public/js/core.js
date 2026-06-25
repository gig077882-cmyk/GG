import {
  statusEl, roomIdEl, roomLinkEl, copyLinkButton,
  chatLogEl, chatPanelEl, chatToggleButton, chatFileInput, chatFileButton,
  mobileChatForm, mobileChatInput, mobileChatFileButton,
  cmdForm, cmdInput, cmdArrow, cmdMenu, muteButton, noiseButton, cameraButton,
  cameraSwitchButton, leaveButton, helpButton, themeModal, themeColorInput,
  themeTextInput, themeApplyButton, themeCancelButton, themeError,
  globalChatModal, globalChatForm, globalChatInput,
  globalChatCloseButton, globalChatToggleButton, themeModeToggleButton,
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
  clearOfferRetry, clearAllOfferRetries, shouldCreateOffer, sendOfferToPeer, handleSignal,
  tuneVideoSender, attachLocalSourceToPeer
} from "./webrtc.js";
import {
  cleanupAudioOutput, applyVolumeToElement,
  ensureProcessedStream, setParticipantVolume
} from "./audio.js";
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
import {
  normalizeAvatarShape,
  applyThemeMode,
  cycleThemeMode,
  updateThemeToggleButton,
  readStoredThemeMode,
  initAutoThemeListener,
  getThemeMode
} from "./theme.js";
import { renderParticipants, updateLocalParticipant } from "./participants.js";
import {
  demoSources, demoState, getDemoSourceIds, setDemoViewMode, updateDemoStatus,
  updateDemoControlState, updateDemoTransform, setDemoScale, nudgeDemo,
  showDemoLoupe, getLocalOwnerId, getLocalVideoSourcesByKind,
  getLocalVideoSourceCount, allocateLocalVideoSourceId, composeLocalVideoLabel,
  composeRemoteVideoLabel, removeDemoSourcesByOwner, showDemoPlaceholder,
  updateDemoSelect, removeDemoSource, upsertDemoSource, fitDemoToViewport,
  resetDemoView, selectDemoSourceByStep, isDemoFullscreen, toggleDemoFullscreen,
  setDemoImageSource, announceDemoStart, announceDemoStop
} from "./demo.js";
import {
  applyVideoTrackHints, addLocalVideoSource, stopLocalVideoSource,
  stopLocalVideoSourcesByKind, refreshPrimaryMediaStreams, updateDemoButtonLabel,
  updateCameraButtonLabel, updateCameraSwitchButtonLabel, startCamera, stopCamera,
  switchCameraFacing, requestCameraStream, startScreenShare, stopScreenShare,
  showCameraPreview, hideCameraPreview, bindCameraPreviewDrag,
  bindCameraPreviewFullscreen, cameraPreviewState, buildCameraVideoConstraints,
  toggleCamera, toggleCameraPreviewFullscreen, restoreCameraPreviewPosition,
  isCameraPreviewFullscreen
} from "./video.js";
import {
  demoWindowState, clampDemoWindowSize, applyDemoWindowRect, placeDemoWindowDefault,
  restoreDemoWindowRect,
  bindDemoWindowControls, bindDemoFullscreenGesture, openDemoModal, closeDemoModal
} from "./demo.js";

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


const setTextColor = (r, g, b) => {
  const red = clampRgb(r);
  const green = clampRgb(g);
  const blue = clampRgb(b);
  const nextColor = `rgb(${red}, ${green}, ${blue})`;
  state.textColor = nextColor;
  document.documentElement.style.setProperty("--accent-color", nextColor);
  if (getThemeMode() === "light") {
    document.documentElement.style.setProperty("--text-color", "#111111");
  } else {
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
    document.documentElement.style.setProperty("--bg-color", background);
    document.documentElement.style.setProperty("--panel-color", panel);
    document.documentElement.style.setProperty("--border-color", border);
  }
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
  applyThemeMode(readStoredThemeMode());
  initAutoThemeListener();
  updateThemeToggleButton(themeModeToggleButton);
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
  ws.onerror = (event) => {
    log(`Global WebSocket error: ${event.type || "unknown"}`);
  };
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
  const parts = String(input || "").trim().replace(/^\/+/, "").split(/\s+/);
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
    log("Microphone access denied; joining without audio");
    setStatus("Microphone access denied; joining without audio");
  }
  if (state.audioContext && state.audioContext.state === "suspended") {
    state.audioContext.resume().catch(() => {});
  }
  const ws = new WebSocket(getWsUrl());
  state.ws = ws;
  updateMobileChatControls();
  setStatus("Connecting to room...");
  ws.onerror = (event) => {
    log(`WebSocket error: ${event.type || "unknown"}`);
  };
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
      if (state.muted && state.localStream) {
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

if (themeModeToggleButton) {
  themeModeToggleButton.addEventListener("click", () => {
    cycleThemeMode();
    updateThemeToggleButton(themeModeToggleButton);
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





