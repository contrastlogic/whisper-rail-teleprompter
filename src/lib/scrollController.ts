const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export interface ScrollControllerOptions {
  basePxPerSecond?: number;
}

export class ScrollController {
  private readonly basePxPerSecond: number;
  private running = false;
  private targetMultiplier = 1;
  private currentMultiplier = 1;
  private manualOffset = 0;
  private runElapsedSeconds = 0;

  constructor(options: ScrollControllerOptions = {}) {
    this.basePxPerSecond = options.basePxPerSecond ?? 42;
  }

  setRunning(running: boolean): void {
    if (running && !this.running) {
      this.runElapsedSeconds = 0;
    }
    this.running = running;
  }

  setManualOffset(delta: number): void {
    this.manualOffset = clamp(this.manualOffset + delta, -0.35, 0.6);
  }

  setSpeechMultiplier(multiplier: number, isSpeaking: boolean): void {
    const silenceGuard = isSpeaking ? 1 : 0.5;
    this.targetMultiplier = clamp(multiplier * silenceGuard + this.manualOffset, 0.22, 2.2);
  }

  tick(deltaSeconds: number): number {
    if (!this.running) {
      return 0;
    }

    this.runElapsedSeconds += deltaSeconds;
    const smoothing = 1 - Math.exp(-deltaSeconds * 3.5);
    this.currentMultiplier += (this.targetMultiplier - this.currentMultiplier) * smoothing;
    // Ease into pace sync so initial speech doesn't jump the scroll.
    const startupRamp = clamp(this.runElapsedSeconds / 2.2, 0, 1);
    const startupSpeedFactor = 0.45 + startupRamp * 0.55;
    return this.basePxPerSecond * this.currentMultiplier * startupSpeedFactor * deltaSeconds;
  }

  reset(): void {
    this.running = false;
    this.targetMultiplier = 1;
    this.currentMultiplier = 1;
    this.manualOffset = 0;
    this.runElapsedSeconds = 0;
  }
}
