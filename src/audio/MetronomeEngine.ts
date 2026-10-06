import type { MetronomeTimeSignature } from '../types';

export type MetronomeTickCallback = (beat: number, totalBeats: number, isAccented: boolean) => void;

export class MetronomeEngine {
  private static instance: MetronomeEngine;
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  private bpm: number = 100;
  private timeSignature: MetronomeTimeSignature = '4/4';
  private volume: number = 0.75;
  private currentBeat: number = 0;
  private nextNoteTime: number = 0;
  private timerId: number | null = null;
  private tickCallback: MetronomeTickCallback | null = null;

  private readonly lookaheadMs: number = 25.0;
  private readonly scheduleAheadSec: number = 0.1;

  private constructor() {}

  public static getInstance(): MetronomeEngine {
    if (!MetronomeEngine.instance) {
      MetronomeEngine.instance = new MetronomeEngine();
    }
    return MetronomeEngine.instance;
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setCallback(cb: MetronomeTickCallback | null) {
    this.tickCallback = cb;
  }

  public setBpm(bpm: number) {
    this.bpm = Math.max(30, Math.min(280, bpm));
  }

  public getBpm(): number {
    return this.bpm;
  }

  public setTimeSignature(ts: MetronomeTimeSignature) {
    this.timeSignature = ts;
    this.currentBeat = 0;
  }

  public getTimeSignature(): MetronomeTimeSignature {
    return this.timeSignature;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public start() {
    if (this.isRunning) return;
    this.initContext();
    if (!this.ctx) return;

    this.isRunning = true;
    this.currentBeat = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduler();
  }

  public stop() {
    this.isRunning = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private getBeatsPerMeasure(): number {
    switch (this.timeSignature) {
      case '3/4':
        return 3;
      case '6/8':
        return 6;
      case '4/4':
      default:
        return 4;
    }
  }

  private isBeatAccented(beat: number): boolean {
    if (this.timeSignature === '6/8') {
      return beat === 0 || beat === 3;
    }
    return beat === 0;
  }

  private scheduler = () => {
    if (!this.isRunning || !this.ctx) return;

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadSec) {
      this.scheduleClick(this.nextNoteTime, this.currentBeat);
      this.advanceBeat();
    }

    this.timerId = window.setTimeout(this.scheduler, this.lookaheadMs);
  };

  private advanceBeat() {
    const totalBeats = this.getBeatsPerMeasure();
    // 6/8 counts eighth notes (twice the speed of quarter note bpm)
    const secondsPerBeat = this.timeSignature === '6/8' ? (60.0 / this.bpm) / 2 : 60.0 / this.bpm;
    this.nextNoteTime += secondsPerBeat;
    this.currentBeat = (this.currentBeat + 1) % totalBeats;
  }

  private scheduleClick(time: number, beat: number) {
    if (!this.ctx || this.volume <= 0.001) return;

    const isAccented = this.isBeatAccented(beat);
    const totalBeats = this.getBeatsPerMeasure();

    // Trigger visual/state tick callback at the right time
    const delayMs = Math.max(0, (time - this.ctx.currentTime) * 1000);
    setTimeout(() => {
      if (this.isRunning && this.tickCallback) {
        this.tickCallback(beat, totalBeats, isAccented);
      }
    }, delayMs);

    // Audio synthesis of metronome click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // High woodblock pitch for accent, punchy lower pitch for regular beat
    if (isAccented) {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1600, time);
      osc.frequency.exponentialRampToValueAtTime(400, time + 0.035);
      gain.gain.setValueAtTime(this.volume * 0.9, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, time);
      osc.frequency.exponentialRampToValueAtTime(300, time + 0.025);
      gain.gain.setValueAtTime(this.volume * 0.55, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    }

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.05);
  }
}

export const metronomeEngine = MetronomeEngine.getInstance();
