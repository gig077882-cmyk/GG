/**
 * DOM element references used across the application.
 * @module dom
 */

export const statusEl = document.getElementById("status");
export const participantsEl = document.getElementById("participants");
export const roomIdEl = document.getElementById("room-id");
export const roomLinkEl = document.getElementById("room-link");
export const copyLinkButton = document.getElementById("btn-copy-link");
export const logEl = document.getElementById("log");
export const chatPanelEl = document.getElementById("chat-panel");
export const chatLogEl = document.getElementById("chat-log");
export const chatToggleButton = document.getElementById("btn-chat-toggle");
export const chatFileInput = document.getElementById("chat-file-input");
export const chatFileButton = document.getElementById("btn-chat-file");
export const mobileChatForm = document.getElementById("mobile-chat-form");
export const mobileChatInput = document.getElementById("mobile-chat-input");
export const mobileChatSendButton = document.getElementById("mobile-chat-send");
export const mobileChatFileButton = document.getElementById("mobile-chat-file");
export const cmdForm = document.getElementById("cmd-form");
export const cmdInput = document.getElementById("cmd-input");
export const cmdArrow = document.querySelector(".cmd-arrow");
export const cmdMenu = document.getElementById("cmd-menu");
export const muteButton = document.getElementById("btn-mute");
export const noiseButton = document.getElementById("btn-noise");
export const cameraButton = document.getElementById("btn-camera");
export const cameraSwitchButton = document.getElementById("btn-camera-switch");
export const leaveButton = document.getElementById("btn-leave");
export const helpButton = document.getElementById("btn-help");
export const themeModal = document.getElementById("theme-modal");
export const themeColorInput = document.getElementById("theme-color-input");
export const themeTextInput = document.getElementById("theme-text-input");
export const themeApplyButton = document.getElementById("theme-apply");
export const themeCancelButton = document.getElementById("theme-cancel");
export const themeError = document.getElementById("theme-error");
export const globalChatModal = document.getElementById("global-chat-modal");
export const globalChatLog = document.getElementById("global-chat-log");
export const globalChatForm = document.getElementById("global-chat-form");
export const globalChatInput = document.getElementById("global-chat-input");
export const globalChatSendButton = document.getElementById("global-chat-send");
export const globalChatCloseButton = document.getElementById("global-chat-close");
export const globalChatToggleButton = document.getElementById("global-chat-toggle");
export const themeModeToggleButton = document.getElementById("theme-mode-toggle");
export const demoButton = document.getElementById("btn-demo");
export const demoModal = document.getElementById("demo-modal");
export const demoModalContent = document.getElementById("demo-modal-content");
export const demoHeader = demoModalContent?.querySelector(".demo-header") || null;
export const demoStage = document.getElementById("demo-stage");
export const demoViewport = document.getElementById("demo-viewport");
export const demoVideo = document.getElementById("demo-video");
export const demoLoader = document.getElementById("demo-loader");
export const demoLoupe = document.getElementById("demo-loupe");
export const demoResizeHandle = document.getElementById("demo-resize");
export const demoClose = document.getElementById("demo-close");
export const demoZoomIndicator = document.getElementById("demo-zoom-indicator");
export const demoUserSelect = document.getElementById("demo-user-select");
export const demoStatus = document.getElementById("demo-status");
export const demoSourcePrevButton = document.getElementById("demo-source-prev");
export const demoSourceNextButton = document.getElementById("demo-source-next");
export const demoZoomOutButton = document.getElementById("demo-zoom-out");
export const demoZoomInButton = document.getElementById("demo-zoom-in");
export const demoFitButton = document.getElementById("demo-fit");
export const demoResetViewButton = document.getElementById("demo-reset-view");
export const demoFullscreenButton = document.getElementById("demo-fullscreen");
export const demoShareToggleButton = document.getElementById("demo-share-toggle");
export const policyModal = document.getElementById("policy-modal");
export const policyAcceptButton = document.getElementById("policy-accept");
export const modalOverlay = document.getElementById("modal-overlay");
export const cameraPreview = document.getElementById("camera-preview");
export const cameraPreviewHandle = document.getElementById("camera-preview-handle");
export const cameraPreviewVideo = document.getElementById("camera-preview-video");
export const cameraPreviewResize = document.getElementById("camera-preview-resize");
export const mobilePanelsRoot = document.querySelector(".mobile-panels");
export const mobileTabButtons = Array.from(document.querySelectorAll("[data-mobile-tab-btn]"));
export const mobileTabPanes = Array.from(document.querySelectorAll("[data-mobile-tab-pane]"));
export const mobileChatTabButton = document.querySelector('[data-mobile-tab-btn="chat"]');
export const mobileConsoleTabButton = document.querySelector('[data-mobile-tab-btn="console"]');

/**
 * Update the modal overlay visibility based on open modals.
 * @returns {void}
 */
export const updateModalOverlayState = () => {
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
