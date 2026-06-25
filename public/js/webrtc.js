/**
 * WebRTC signaling and offer/answer helpers.
 * @module webrtc
 */

import { state, offerRetryTimers, OFFER_RETRY_DELAY_MS } from "./state.js";
import { sendMessage } from "./ws.js";

/**
 * Tune encoding parameters for a video sender.
 * @param {RTCRtpSender} sender - Sender to tune.
 * @param {"camera"|"screen"} kind - Video source kind.
 * @returns {void}
 */
export const tuneVideoSender = (sender, kind) => {
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

/**
 * Attach a local video source track to a peer connection.
 * @param {object} source - Local video source.
 * @param {string} peerId - Peer id.
 * @param {object} peer - Peer wrapper.
 * @returns {void}
 */
export const attachLocalSourceToPeer = (source, peerId, peer) => {
  if (!source || !peer || source.senders.has(peerId)) {
    return;
  }
  const sender = peer.pc.addTrack(source.track, source.stream);
  source.senders.set(peerId, sender);
  tuneVideoSender(sender, source.kind);
};

/**
 * Cancel a pending offer retry timer for a peer.
 * @param {string} peerId - Peer identifier.
 * @returns {void}
 */
export const clearOfferRetry = (peerId) => {
  const timer = offerRetryTimers.get(peerId);
  if (!timer) {
    return;
  }
  clearTimeout(timer);
  offerRetryTimers.delete(peerId);
};

/**
 * Cancel all pending offer retry timers.
 * @returns {void}
 */
export const clearAllOfferRetries = () => {
  offerRetryTimers.forEach((timer) => clearTimeout(timer));
  offerRetryTimers.clear();
};

/**
 * Decide whether this client should initiate the offer to a peer.
 * @param {string} peerId - Peer identifier.
 * @returns {boolean} True if this client should create the offer.
 */
export const shouldCreateOffer = (peerId) => {
  if (!state.clientId) {
    return false;
  }
  return state.clientId > peerId;
};

/**
 * Send a WebRTC offer to a peer, with retry logic for non-stable signaling state.
 * @param {string} peerId - Peer identifier.
 * @returns {Promise<void>}
 */
export const sendOfferToPeer = async (peerId) => {
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

/**
 * Handle an incoming signaling message from a peer.
 * @param {string} from - Sender peer id.
 * @param {object} data - Signal payload.
 * @returns {Promise<void>}
 */
export const handleSignal = async (from, data) => {
  const peer = state.peers.get(from);
  if (!peer) {
    return;
  }
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
