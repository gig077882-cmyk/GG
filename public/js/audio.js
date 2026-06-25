/**
 * Audio processing, output and noise suppression.
 * @module audio
 */

import { state } from "./state.js";
import { log } from "./logger.js";

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
    const highpass = state.audioContext.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 80;
    highpass.Q.value = 0.7;
    const compressor = state.audioContext.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.12;
    const gain = state.audioContext.createGain();
    source.connect(highpass).connect(compressor).connect(gain).connect(state.audioContext.destination);
    const output = { source, gain, highpass, compressor };
    state.remoteAudioOutputs.set(audio.id, output);
    return output;
  } catch {
    return null;
  }
};

export const cleanupAudioOutput = (audioId) => {
  const output = state.remoteAudioOutputs.get(audioId);
  if (!output) {
    return;
  }
  output.source.disconnect();
  if (output.highpass) {
    output.highpass.disconnect();
  }
  if (output.compressor) {
    output.compressor.disconnect();
  }
  output.gain.disconnect();
  state.remoteAudioOutputs.delete(audioId);
};

export const applyVolumeToElement = (audio, level) => {
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

const getAudioElement = (participantId) =>
  document.getElementById(`audio-${participantId}`);

export const setParticipantVolume = (participantId, level) => {
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
    this.gateThreshold = 0.45;
    this.gateFloor = 0.02;
    this.gain = 1;
    this.holdFrames = 0;
    this.maxHoldFrames = Math.round(sampleRate * 0.12 / 128);
    this.attackCoeff = Math.exp(-1 / (sampleRate * 0.006));
    this.releaseCoeff = Math.exp(-1 / (sampleRate * 0.18));
    this.ready = false;
    this.port.onmessage = (event) => {
      if (event.data && event.data.type === "level") {
        const value = Math.min(1, Math.max(0, Number(event.data.value) || 0));
        this.mix = 0.2 + value * 0.8;
        this.gateThreshold = 0.5 - value * 0.45;
        this.gateFloor = 0.15 - value * 0.13;
        this.maxHoldFrames = Math.round(sampleRate * (0.05 + value * 0.15) / 128);
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
    for (let i = 0; i < outputChannel.length; i += 1) {
      const sample = inputChannel ? inputChannel[i] : 0;
      let processed = sample;
      let vadProb = 0.5;
      if (this.ready) {
        this.pending[this.pendingIndex] = sample;
        this.pendingIndex += 1;
        if (this.pendingIndex >= this.frameSize) {
          this.inHeap.set(this.pending);
          vadProb = this.module._rnnoise_process_frame(this.statePtr, this.outPtr, this.inPtr);
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
      const isVoice = Number.isFinite(vadProb) && vadProb >= this.gateThreshold;
      if (isVoice) {
        this.holdFrames = this.maxHoldFrames;
      } else if (this.holdFrames > 0) {
        this.holdFrames -= 1;
      }
      const targetGain = this.holdFrames > 0 ? 1 : this.gateFloor;
      const coeff = targetGain > this.gain ? this.attackCoeff : this.releaseCoeff;
      this.gain = targetGain + (this.gain - targetGain) * coeff;
      outputChannel[i] = mixed * this.gain;
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

export const ensureProcessedStream = async () => {
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
  highpass.frequency.value = 80;
  highpass.Q.value = 0.7;
  const lowpass = state.audioContext.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 12000;
  lowpass.Q.value = 0.7;
  const compressor = state.audioContext.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 12;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.12;
  const limiter = state.audioContext.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0;
  limiter.release.value = 0.05;
  const destination = state.audioContext.createMediaStreamDestination();
  source
    .connect(highpass)
    .connect(lowpass)
    .connect(processor)
    .connect(compressor)
    .connect(limiter)
    .connect(destination);
  processor.port.postMessage({ type: "level", value: state.noiseLevel / 100 });
  state.processingSource = source;
  state.processingNode = processor;
  state.processingDestination = destination;
  state.processedStream = destination.stream;
  return state.processedStream;
};
