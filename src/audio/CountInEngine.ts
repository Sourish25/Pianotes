import { metronomeEngine } from './MetronomeEngine';

export type CountInTickCallback = (beat: number, totalBeats: number, isAccented: boolean) => void;
export type CountInCompleteCallback = () => void;

export interface CountInOptions {
  bpm?: number;
  beats?: number;
  onTick?: CountInTickCallback;
  onComplete?: CountInCompleteCallback;
  playAudio?: boolean;
}

export class CountInEngine {
  private static instance: CountInEngine;
  private timerIds: ReturnType<typeof setTimeout>[] = [];
  private isCountingIn: boolean = false;
  private currentBeat: number = 0;
  private totalBeats: number = 4;

  public static getInstance(): CountInEngine {
    if (!CountInEngine.instance) {
      CountInEngine.instance = new CountInEngine();
    }
    return CountInEngine.instance;
  }

  public isRunning(): boolean {
    return this.isCountingIn;
  }

  public getCurrentBeat(): number {
    return this.currentBeat;
  }

  public getTotalBeats(): number {
    return this.totalBeats;
  }

  public start(options: CountInOptions = {}): { cancel: () => void } {
    this.cancel();

    const bpm = Math.max(30, Math.min(280, options.bpm ?? metronomeEngine.getBpm() ?? 120));
    const totalBeats = Math.max(1, options.beats ?? metronomeEngine.getBeatsPerMeasure() ?? 4);
    const playAudio = options.playAudio !== false;
    const msPerBeat = (60.0 / bpm) * 1000;

    this.isCountingIn = true;
    this.totalBeats = totalBeats;
    this.currentBeat = 1;

    // Trigger Beat 1 immediately for zero-latency audio and visual feedback
    if (playAudio) {
      metronomeEngine.playClick(true);
    }
    if (options.onTick) {
      options.onTick(1, totalBeats, true);
    }

    // Schedule remaining beats (2 through totalBeats)
    for (let beat = 2; beat <= totalBeats; beat++) {
      const delay = (beat - 1) * msPerBeat;

      const timerId = setTimeout(() => {
        if (!this.isCountingIn) return;
        this.currentBeat = beat;

        if (playAudio) {
          metronomeEngine.playClick(false);
        }

        if (options.onTick) {
          options.onTick(beat, totalBeats, false);
        }
      }, delay);

      this.timerIds.push(timerId);
    }

    // Completion timer when 1 bar finishes
    const finishDelay = totalBeats * msPerBeat;
    const completeTimerId = setTimeout(() => {
      if (!this.isCountingIn) return;
      this.isCountingIn = false;
      this.currentBeat = 0;
      this.timerIds = [];
      if (options.onComplete) {
        options.onComplete();
      }
    }, finishDelay);

    this.timerIds.push(completeTimerId);

    return {
      cancel: () => this.cancel(),
    };
  }

  public cancel() {
    this.isCountingIn = false;
    this.currentBeat = 0;
    this.timerIds.forEach((id) => clearTimeout(id));
    this.timerIds = [];
  }
}

export const countInEngine = CountInEngine.getInstance();
