export interface PaceSample {
  paceMultiplier: number;
  isSpeaking: boolean;
  level: number;
}

interface SpeechPaceOptions {
  onSample: (sample: PaceSample) => void;
  intervalMs?: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export class SpeechPaceEstimator {
  private readonly onSample: (sample: PaceSample) => void;
  private readonly intervalMs: number;
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private data: Float32Array<ArrayBuffer> | null = null;
  private stream: MediaStream | null = null;
  private timer: number | null = null;
  private noiseFloor = 0.008;
  private readonly activityWindow: { active: boolean; at: number }[] = [];
  private wasActive = false;
  private pulseCount = 0;

  constructor(options: SpeechPaceOptions) {
    this.onSample = options.onSample;
    this.intervalMs = options.intervalMs ?? 120;
  }

  async start(): Promise<void> {
    if (this.timer !== null) {
      return;
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.context = new AudioContext();
    const source = this.context.createMediaStreamSource(this.stream);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.6;
    source.connect(this.analyser);
    this.data = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>;

    this.timer = window.setInterval(() => this.sample(), this.intervalMs);
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }

    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;

    void this.context?.close();
    this.context = null;
    this.analyser = null;
    this.data = null;
    this.activityWindow.length = 0;
    this.wasActive = false;
    this.pulseCount = 0;
  }

  private sample(): void {
    if (!this.analyser || !this.data) {
      return;
    }

    this.analyser.getFloatTimeDomainData(this.data);
    const rms = Math.sqrt(this.data.reduce((sum, value) => sum + value * value, 0) / this.data.length);

    this.noiseFloor = this.noiseFloor * 0.98 + rms * 0.02;
    const threshold = Math.max(0.012, this.noiseFloor * 2.1);
    const active = rms > threshold;

    if (active && !this.wasActive) {
      this.pulseCount += 1;
    }
    this.wasActive = active;

    const now = performance.now();
    this.activityWindow.push({ active, at: now });
    const cutoff = now - 4000;
    while (this.activityWindow.length > 0 && this.activityWindow[0].at < cutoff) {
      this.activityWindow.shift();
    }

    const activeFrames = this.activityWindow.filter((entry) => entry.active).length;
    const activityRatio =
      this.activityWindow.length === 0 ? 0 : activeFrames / this.activityWindow.length;
    const pulseRatePerSecond = this.pulseCount / 4;
    this.pulseCount = Math.max(0, this.pulseCount - 0.25);

    const rawPace = activityRatio * 1.35 + pulseRatePerSecond * 0.18;
    const paceMultiplier = clamp(rawPace, 0.55, 1.75);
    const isSpeaking = activityRatio > 0.08;

    this.onSample({
      paceMultiplier,
      isSpeaking,
      level: clamp(rms * 12, 0, 1),
    });
  }
}
