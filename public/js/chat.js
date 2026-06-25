/**
 * Room chat UI and file message helpers.
 * @module chat
 */

import {
  chatLogEl, chatPanelEl, chatFileInput, chatFileButton,
  mobileChatInput, mobileChatSendButton, mobileChatFileButton,
  globalChatLog, globalChatInput, globalChatSendButton
} from "./dom.js";
import {
  state, isMobileCallMode, MAX_CHAT_HISTORY, MAX_GLOBAL_CHAT_HISTORY,
  MAX_FILE_SIZE, MAX_TEXT_PREVIEW
} from "./state.js";
import { formatChatTime, formatFileSize, normalizeFilename, isTextFile, isImageFile, clampTextPreview } from "./utils.js";
import { setMobileChatUnread } from "./mobile.js";
import { sendMessage } from "./ws.js";
import { log } from "./logger.js";

/**
 * Build a chat message DOM element.
 * @param {object} message - Message payload.
 * @param {string} [message.type] - Message type.
 * @param {string} [message.name] - Author name override.
 * @param {string} [message.text] - Message text.
 * @param {number} [message.ts] - Timestamp.
 * @param {string} [message.from] - Author participant id.
 * @param {object} [message.file] - Attached file metadata.
 * @returns {HTMLElement} Message element.
 */
export const createChatMessageElement = ({ type, name, text, ts, from, file }) => {
  const line = document.createElement("div");
  line.className = "chat-message";
  const participant = from ? state.participants.get(from) : null;
  const displayName = name || participant?.name || "Гость";
  const timeLabel = ts ? `[${formatChatTime(ts)}] ` : "";
  const header = document.createElement("div");
  header.className = "chat-message-header";
  const timeEl = document.createElement("span");
  timeEl.textContent = timeLabel;
  const authorEl = document.createElement("span");
  authorEl.className = "chat-message-author";
  authorEl.textContent = `${displayName}: `;
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
      link.textContent = "Скачать";
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

/**
 * Append a message to the room chat log.
 * @param {object} message - Message payload.
 * @param {object} [options={}] - Options.
 * @param {boolean} [options.markUnread=true] - Mark chat unread on mobile.
 * @returns {void}
 */
export const appendChatMessage = (message, options = {}) => {
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

/**
 * Render the room chat history.
 * @param {object[]} messages - Array of messages.
 * @returns {void}
 */
export const renderChatHistory = (messages) => {
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

/**
 * Build a global chat message element with a room badge.
 * @param {object} message - Message payload.
 * @returns {HTMLElement} Message element.
 */
export const createGlobalChatMessageElement = (message) => {
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

/**
 * Append a message to the global chat log.
 * @param {object} message - Message payload.
 * @returns {void}
 */
export const appendGlobalChatMessage = (message) => {
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

/**
 * Render global chat history.
 * @param {object[]} messages - Array of messages.
 * @returns {void}
 */
export const renderGlobalChatHistory = (messages) => {
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

/**
 * Set the room chat panel visibility.
 * @param {boolean} hidden - Whether to hide the panel.
 * @returns {void}
 */
export const setChatHidden = (hidden) => {
  const effectiveHidden = isMobileCallMode ? false : hidden;
  state.chatHidden = effectiveHidden;
  if (chatLogEl) {
    chatLogEl.classList.toggle("hidden", hidden);
  }
  if (chatPanelEl) {
    chatPanelEl.classList.toggle("hidden", hidden);
    chatPanelEl.setAttribute("aria-expanded", hidden ? "false" : "true");
  }
};

/**
 * Toggle the room chat panel visibility.
 * @returns {void}
 */
export const toggleChatHidden = () => {
  setChatHidden(!state.chatHidden);
};

/**
 * Open the native file picker for sending a file.
 * @returns {void}
 */
export const openChatFilePicker = () => {
  if (!chatFileInput) {
    log("Отправка файлов недоступна");
    return;
  }
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    log("Сначала подключитесь к комнате");
    return;
  }
  chatFileInput.click();
};

/**
 * Read a file as text.
 * @param {File} file - File object.
 * @returns {Promise<string>} File text.
 */
export const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

/**
 * Read the first bytes of a file as text.
 * @param {File} file - File object.
 * @param {number} limit - Maximum bytes to read.
 * @returns {Promise<string>} Slice text.
 */
export const readFileSliceAsText = (file, limit) => {
  const slice = file.slice(0, limit);
  return readFileAsText(slice);
};

/**
 * Update the enabled/disabled state of the chat file button.
 * @returns {void}
 */
export const updateChatFileButton = () => {
  if (!chatFileButton) {
    return;
  }
  const hasFile = Boolean(chatFileInput?.files?.length);
  const canSend = state.ws && state.ws.readyState === WebSocket.OPEN && hasFile;
  chatFileButton.disabled = !canSend;
};

/**
 * Update mobile and global chat input placeholders and button states.
 * @returns {void}
 */
export const updateMobileChatControls = () => {
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

/**
 * Send a text message to the room chat.
 * @param {string} text - Message text.
 * @returns {boolean} True if the message was sent.
 */
export const sendChatMessage = (text) => {
  const value = String(text || "").trim();
  if (!value) {
    return false;
  }
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    log("Сначала подключитесь к комнате");
    return false;
  }
  sendMessage({ type: "chat", text: value });
  return true;
};

/**
 * Upload a file and send it as a file message.
 * @param {File} file - File to send.
 * @returns {Promise<void>}
 */
export const sendFileMessage = async (file) => {
  if (!file) {
    log("Файл не выбран");
    return;
  }
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    log("Сначала подключитесь к комнате");
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    log(`Файл слишком большой (макс ${formatFileSize(MAX_FILE_SIZE)})`);
    return;
  }
  let textPreview = "";
  try {
    if (isTextFile(file)) {
      const rawText = await readFileSliceAsText(file, MAX_TEXT_PREVIEW * 4);
      textPreview = clampTextPreview(String(rawText || ""));
    }
  } catch {
    log("Не удалось прочитать файл");
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
      log("Не удалось загрузить файл");
      return;
    }
    upload = await response.json();
  } catch {
    log("Не удалось загрузить файл");
    return;
  }
  if (!upload?.fileId || !upload?.url) {
    log("Не удалось загрузить файл");
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
