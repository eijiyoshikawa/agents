/**
 * Tiny RMS-based voice activity detector.
 *
 * Runs on the AnalyserNode output and emits coarse `voiceStart` / `voiceEnd`
 * callbacks. Tunable via `silenceMs` (how long of below-threshold audio
 * counts as utterance end) and `threshold` (RMS in 0–1 space).
 *
 * Not as accurate as Silero VAD but small enough to ship without extra deps.
 */

export interface VADOptions {
  threshold?: number;
  silenceMs?: number;
  minVoiceMs?: number;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
}

export class RmsVAD {
  private analyser: AnalyserNode;
  private buf: Uint8Array;
  private rafId: number | null = null;
  private inSpeech = false;
  private silenceStart = 0;
  private speechStart = 0;
  private readonly threshold: number;
  private readonly silenceMs: number;
  private readonly minVoiceMs: number;

  constructor(
    private ctx: AudioContext,
    sourceNode: MediaStreamAudioSourceNode,
    private opts: VADOptions = {},
  ) {
    this.threshold = opts.threshold ?? 0.025;
    this.silenceMs = opts.silenceMs ?? 700;
    this.minVoiceMs = opts.minVoiceMs ?? 250;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.buf = new Uint8Array(this.analyser.fftSize);
    sourceNode.connect(this.analyser);
  }

  start() {
    if (this.rafId !== null) return;
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      this.evaluate();
    };
    tick();
  }

  stop() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private evaluate() {
    this.analyser.getByteTimeDomainData(this.buf);
    const rms = computeRms(this.buf);
    const now = performance.now();

    if (rms > this.threshold) {
      if (!this.inSpeech) {
        this.inSpeech = true;
        this.speechStart = now;
        this.opts.onVoiceStart?.();
      }
      this.silenceStart = 0;
    } else if (this.inSpeech) {
      if (this.silenceStart === 0) this.silenceStart = now;
      const silentFor = now - this.silenceStart;
      const spokenFor = now - this.speechStart;
      if (silentFor >= this.silenceMs && spokenFor >= this.minVoiceMs) {
        this.inSpeech = false;
        this.silenceStart = 0;
        this.opts.onVoiceEnd?.();
      }
    }
  }
}

function computeRms(buf: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buf.length);
}
