/**
 * Global application state and constants.
 * @module state
 */

/**
 * Keys used for localStorage and sessionStorage.
 * @type {Record<string, string>}
 */
export const STORAGE_KEYS = {
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

/**
 * Default ICE servers used when the server endpoint is unreachable.
 * @type {RTCIceServer[]}
 */
export const DEFAULT_ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

/**
 * Maximum size of a chat file in bytes.
 * @type {number}
 */
export const MAX_FILE_SIZE = 500 * 1024 * 1024;

/**
 * Maximum length of a text file preview.
 * @type {number}
 */
export const MAX_TEXT_PREVIEW = 1200;

/**
 * Maximum number of chat messages kept per room.
 * @type {number}
 */
export const MAX_CHAT_HISTORY = 100;

/**
 * Maximum number of global chat messages kept.
 * @type {number}
 */
export const MAX_GLOBAL_CHAT_HISTORY = 200;

/**
 * Delay before retrying a WebRTC offer.
 * @type {number}
 */
export const OFFER_RETRY_DELAY_MS = 180;

/**
 * Delay before reconnecting to the global chat socket.
 * @type {number}
 */
export const GLOBAL_CHAT_RETRY_MS = 1500;

/**
 * Timers for pending WebRTC offer retries.
 * @type {Map<string, number>}
 */
export const offerRetryTimers = new Map();

/**
 * Query parameters from the current URL.
 * @type {URLSearchParams}
 */
export const pageParams = new URLSearchParams(location.search);

/**
 * Whether the current page is the mobile interface.
 * @type {boolean}
 */
export const isMobilePage = /(^|\/)mobile\.html$/i.test(location.pathname);

/**
 * Whether the mobile interface is running in call mode (not forced desktop).
 * @type {boolean}
 */
export const isMobileCallMode = isMobilePage && pageParams.get("desktop") !== "1";

/**
 * Flag forcing demo windows to a fixed 16:9 aspect ratio.
 * @type {boolean}
 */
export const DEMO_COMPACT_WINDOW = true;

/**
 * Default display name for new users.
 * @type {string}
 */
export const DEFAULT_NAME = "Гость";

/**
 * Default text/accent color.
 * @type {string}
 */
export const DEFAULT_TEXT_COLOR = "rgb(185, 251, 192)";

/**
 * Mutable global state object.
 * @type {object}
 */
export const state = {
  ws: null,
  globalWs: null,
  roomId: null,
  key: null,
  clientId: null,
  name: DEFAULT_NAME,
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
  textColor: DEFAULT_TEXT_COLOR,
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
