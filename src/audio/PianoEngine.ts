import type { InstrumentType, DSPSettings } from '../types';

export class PianoAudioEngine {
  private static instance: PianoAudioEngine;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private tapeDriveNode: WaveShaperNode | null = null;
  private dryGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayWetGain: GainNode | null = null;
  private chorusDelayNode: DelayNode | null = null;
  private chorusLfo: OscillatorNode | null = null;
  private chorusDepthGain: GainNode | null = null;
  private chorusWetGain: GainNode | null = null;

  private dspSettings: DSPSettings = {
    reverb: true,
    reverbWet: 0.28,
    chorus: false,
    chorusDepth: 0.5,
    delay: false,
    delayFeedback: 0.35,
    tapeDrive: false,
    driveAmount: 0.3,
  };

  private currentInstrument: InstrumentType = 'concert-grand';
  private sustainPedal = false;
  private activeVoices: Map<number, { stop: () => void; isSustained: boolean }> = new Map();

  private constructor() {}

  public static getInstance(): PianoAudioEngine {
    if (!PianoAudioEngine.instance) {
      PianoAudioEngine.instance = new PianoAudioEngine();
    }
    return PianoAudioEngine.instance;
  }

  public init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    // 1. Tape Drive Saturation
    this.tapeDriveNode = this.ctx.createWaveShaper();
    this.tapeDriveNode.curve = this.dspSettings.tapeDrive
      ? this.createSaturationCurve(15 * this.dspSettings.driveAmount)
      : this.createLinearCurve();
    this.tapeDriveNode.oversample = '4x';

    // 2. Chorus Engine
    this.chorusDelayNode = this.ctx.createDelay();
    this.chorusDelayNode.delayTime.setValueAtTime(0.025, this.ctx.currentTime);

    this.chorusLfo = this.ctx.createOscillator();
    this.chorusLfo.frequency.setValueAtTime(1.4, this.ctx.currentTime);

    this.chorusDepthGain = this.ctx.createGain();
    this.chorusDepthGain.gain.setValueAtTime(0.0025, this.ctx.currentTime);

    this.chorusLfo.connect(this.chorusDepthGain);
    this.chorusDepthGain.connect(this.chorusDelayNode.delayTime);
    this.chorusLfo.start();

    this.chorusWetGain = this.ctx.createGain();
    this.chorusWetGain.gain.setValueAtTime(
      this.dspSettings.chorus ? this.dspSettings.chorusDepth * 0.45 : 0.0,
      this.ctx.currentTime
    );

    // 3. Delay Engine (Ping-Pong / Tempo Echo)
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayNode.delayTime.setValueAtTime(0.36, this.ctx.currentTime);

    this.delayFeedbackGain = this.ctx.createGain();
    this.delayFeedbackGain.gain.setValueAtTime(
      this.dspSettings.delayFeedback,
      this.ctx.currentTime
    );

    this.delayWetGain = this.ctx.createGain();
    this.delayWetGain.gain.setValueAtTime(
      this.dspSettings.delay ? 0.3 : 0.0,
      this.ctx.currentTime
    );

    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);
    this.delayNode.connect(this.delayWetGain);

    // 4. Convolver Reverb Engine
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.generateImpulseResponse(this.ctx, 2.2, 2.0);

    this.reverbWetGain = this.ctx.createGain();
    this.reverbWetGain.gain.setValueAtTime(
      this.dspSettings.reverb ? this.dspSettings.reverbWet : 0.0,
      this.ctx.currentTime
    );

    // 5. Dry Bus
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.setValueAtTime(0.75, this.ctx.currentTime);

    // Wire DSP Chain
    this.masterGain.connect(this.tapeDriveNode);
    this.tapeDriveNode.connect(this.dryGain);
    this.tapeDriveNode.connect(this.chorusDelayNode);
    this.chorusDelayNode.connect(this.chorusWetGain);
    this.tapeDriveNode.connect(this.delayNode);
    this.tapeDriveNode.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbWetGain);

    this.dryGain.connect(this.ctx.destination);
    this.chorusWetGain.connect(this.ctx.destination);
    this.delayWetGain.connect(this.ctx.destination);
    this.reverbWetGain.connect(this.ctx.destination);
  }

  private createLinearCurve(): Float32Array<ArrayBuffer> {
    const n = 256;
    const buffer = new ArrayBuffer(n * 4);
    const curve = new Float32Array(buffer);
    for (let i = 0; i < n; i++) {
      curve[i] = (i * 2) / n - 1;
    }
    return curve;
  }

  private createSaturationCurve(amount: number): Float32Array<ArrayBuffer> {
    const k = Math.max(1, amount);
    const n = 4096;
    const buffer = new ArrayBuffer(n * 4);
    const curve = new Float32Array(buffer);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.tanh(x * (1 + k * 0.15));
    }
    return curve;
  }

  private generateImpulseResponse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const factor = Math.exp(-n * decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    return impulse;
  }

  public getDSPSettings(): DSPSettings {
    return { ...this.dspSettings };
  }

  public updateDSPSettings(settings: Partial<DSPSettings>) {
    this.dspSettings = { ...this.dspSettings, ...settings };
    this.applyDSPSettings();
  }

  private applyDSPSettings() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.tapeDriveNode) {
      this.tapeDriveNode.curve = this.dspSettings.tapeDrive
        ? this.createSaturationCurve(15 * this.dspSettings.driveAmount)
        : this.createLinearCurve();
    }

    if (this.chorusWetGain) {
      this.chorusWetGain.gain.setTargetAtTime(
        this.dspSettings.chorus ? this.dspSettings.chorusDepth * 0.45 : 0.0,
        now,
        0.05
      );
    }

    if (this.delayWetGain && this.delayFeedbackGain) {
      this.delayWetGain.gain.setTargetAtTime(
        this.dspSettings.delay ? 0.32 : 0.0,
        now,
        0.05
      );
      this.delayFeedbackGain.gain.setTargetAtTime(
        this.dspSettings.delayFeedback,
        now,
        0.05
      );
    }

    if (this.reverbWetGain) {
      this.reverbWetGain.gain.setTargetAtTime(
        this.dspSettings.reverb ? this.dspSettings.reverbWet : 0.0,
        now,
        0.05
      );
    }
  }

  public setInstrument(instrument: InstrumentType) {
    this.currentInstrument = instrument;
    if (this.reverbWetGain && this.ctx) {
      const wetLevels: Record<InstrumentType, number> = {
        'concert-grand': 0.35,
        'upright': 0.18,
        'felt': 0.22,
        'neo-rhodes': 0.30,
        'wurlitzer': 0.24,
        'dx7-ep': 0.25,
        'lofi-tape': 0.15,
        'celesta': 0.45,
        'neon-synth': 0.38,
      };
      this.dspSettings.reverbWet = wetLevels[instrument] ?? 0.28;
      if (this.dspSettings.reverb) {
        this.reverbWetGain.gain.setTargetAtTime(this.dspSettings.reverbWet, this.ctx.currentTime, 0.05);
      }
    }
  }

  public getInstrument(): InstrumentType {
    return this.currentInstrument;
  }

  public setSustainPedal(down: boolean) {
    this.sustainPedal = down;
    if (!down) {
      this.activeVoices.forEach((voice, pitch) => {
        if (voice.isSustained) {
          voice.stop();
          this.activeVoices.delete(pitch);
        }
      });
    }
  }

  public isSustainPedalDown(): boolean {
    return this.sustainPedal;
  }

  public midiToFrequency(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  public playNote(midi: number, velocity: number = 0.8) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.activeVoices.has(midi)) {
      this.activeVoices.get(midi)?.stop();
      this.activeVoices.delete(midi);
    }

    const freq = this.midiToFrequency(midi);
    const now = this.ctx.currentTime;
    const gainNode = this.ctx.createGain();

    const panNode = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panNode) {
      const pan = Math.max(-0.85, Math.min(0.85, (midi - 60) / 36));
      panNode.pan.setValueAtTime(pan, now);
      gainNode.connect(panNode);
      panNode.connect(this.masterGain);
    } else {
      gainNode.connect(this.masterGain);
    }

    let stopVoice: () => void = () => {};

    switch (this.currentInstrument) {
      case 'concert-grand':
        stopVoice = this.synthConcertGrand(midi, freq, velocity, gainNode, now);
        break;
      case 'upright':
        stopVoice = this.synthUpright(midi, freq, velocity, gainNode, now);
        break;
      case 'felt':
        stopVoice = this.synthFelt(midi, freq, velocity, gainNode, now);
        break;
      case 'neo-rhodes':
        stopVoice = this.synthRhodes(midi, freq, velocity, gainNode, now);
        break;
      case 'wurlitzer':
        stopVoice = this.synthWurlitzer(midi, freq, velocity, gainNode, now);
        break;
      case 'dx7-ep':
        stopVoice = this.synthDX7(midi, freq, velocity, gainNode, now);
        break;
      case 'lofi-tape':
        stopVoice = this.synthLoFiTape(midi, freq, velocity, gainNode, now);
        break;
      case 'celesta':
        stopVoice = this.synthCelesta(midi, freq, velocity, gainNode, now);
        break;
      case 'neon-synth':
        stopVoice = this.synthNeonSynth(midi, freq, velocity, gainNode, now);
        break;
    }

    this.activeVoices.set(midi, {
      stop: stopVoice,
      isSustained: false,
    });
  }

  public stopNote(midi: number) {
    const voice = this.activeVoices.get(midi);
    if (!voice) return;

    if (this.sustainPedal) {
      voice.isSustained = true;
    } else {
      voice.stop();
      this.activeVoices.delete(midi);
    }
  }

  /* --- Instrument Synthesizers --- */

  private synthConcertGrand(
    _midi: number,
    freq: number,
    velocity: number,
    gainNode: GainNode,
    now: number
  ): () => void {
    if (!this.ctx) return () => {};

    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(freq * 3.5, now);
    clickGain.gain.setValueAtTime(velocity * 0.18, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    clickOsc.connect(clickGain);
    clickGain.connect(gainNode);
    clickOsc.start(now);
    clickOsc.stop(now + 0.05);

    const harmonics = [1, 2, 3, 4, 5, 6];
    const amplitudes = [1.0, 0.45, 0.22, 0.12, 0.06, 0.03];
    const oscs: OscillatorNode[] = [];

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.9, now + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);

    harmonics.forEach((harmonic, index) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const hGain = this.ctx.createGain();
      const inharmonicFactor = 1 + index * 0.0015;
      osc.type = index === 0 ? 'sine' : index % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq * harmonic * inharmonicFactor, now);

      hGain.gain.setValueAtTime(amplitudes[index] ?? 0.05, now);
      hGain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5 / (index + 1));

      osc.connect(hGain);
      hGain.connect(gainNode);
      osc.start(now);
      oscs.push(osc);
    });

    return () => {
      if (!this.ctx) return;
      const releaseTime = this.ctx.currentTime;
      gainNode.gain.cancelScheduledValues(releaseTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, releaseTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseTime + 0.25);
      setTimeout(() => {
        oscs.forEach((o) => {
          try {
            o.stop();
          } catch {
            /* ignore */
          }
        });
      }, 300);
    };
  }

  private synthUpright(
    _midi: number,
    freq: number,
    velocity: number,
    gainNode: GainNode,
    now: number
  ): () => void {
    if (!this.ctx) return () => {};

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, now);
    filter.connect(gainNode);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.85, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 4.0);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 1.002, now);

    osc1.connect(filter);
    osc2.connect(filter);
    osc1.start(now);
    osc2.start(now);

    return () => {
      if (!this.ctx) return;
      const releaseTime = this.ctx.currentTime;
      gainNode.gain.cancelScheduledValues(releaseTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, releaseTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseTime + 0.18);
      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
        } catch {
          /* ignore */
        }
      }, 220);
    };
  }

  private synthFelt(
    _midi: number,
    freq: number,
    velocity: number,
    gainNode: GainNode,
    now: number
  ): () => void {
    if (!this.ctx) return () => {};

    // Intimate muted felt piano: warm lowpass filter, gentle hammer thud
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.Q.setValueAtTime(0.7, now);
    filter.connect(gainNode);

    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(120, now);
    thudGain.gain.setValueAtTime(velocity * 0.22, now);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    thudOsc.connect(thudGain);
    thudGain.connect(gainNode);
    thudOsc.start(now);
    thudOsc.stop(now + 0.05);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.0, now);

    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.12, now);
    osc2Gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.8, now + 0.016);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);

    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);

    osc1.start(now);
    osc2.start(now);

    return () => {
      if (!this.ctx) return;
      const releaseTime = this.ctx.currentTime;
      gainNode.gain.cancelScheduledValues(releaseTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, releaseTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseTime + 0.2);
      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
        } catch {
          /* ignore */
        }
      }, 250);
    };
  }

  private synthRhodes(
    _midi: number,
    freq: number,
    velocity: number,
    gainNode: GainNode,
    now: number
  ): () => void {
    if (!this.ctx) return () => {};

    const bodyOsc = this.ctx.createOscillator();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(freq, now);

    const tineOsc = this.ctx.createOscillator();
    tineOsc.type = 'sine';
    tineOsc.frequency.setValueAtTime(freq * 4.01, now);

    const tineGain = this.ctx.createGain();
    tineGain.gain.setValueAtTime(velocity * 0.5, now);
    tineGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    const tremolo = this.ctx.createOscillator();
    const tremoloGain = this.ctx.createGain();
    tremolo.frequency.setValueAtTime(4.8, now);
    tremoloGain.gain.setValueAtTime(0.12, now);
    tremolo.connect(tremoloGain.gain);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.8, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 5.0);

    bodyOsc.connect(gainNode);
    tineOsc.connect(tineGain);
    tineGain.connect(gainNode);

    bodyOsc.start(now);
    tineOsc.start(now);
    tremolo.start(now);

    return () => {
      if (!this.ctx) return;
      const releaseTime = this.ctx.currentTime;
      gainNode.gain.cancelScheduledValues(releaseTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, releaseTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseTime + 0.22);
      setTimeout(() => {
        try {
          bodyOsc.stop();
          tineOsc.stop();
          tremolo.stop();
        } catch {
          /* ignore */
        }
      }, 250);
    };
  }

  private synthWurlitzer(
    _midi: number,
    freq: number,
    velocity: number,
    gainNode: GainNode,
    now: number
  ): () => void {
    if (!this.ctx) return () => {};

    // Vintage Reed Electric Piano with distinctive bark and tremolo
    const reedFilter = this.ctx.createBiquadFilter();
    reedFilter.type = 'bandpass';
    reedFilter.frequency.setValueAtTime(Math.min(freq * 2.8, 3800), now);
    reedFilter.Q.setValueAtTime(1.8, now);

    const tremolo = this.ctx.createOscillator();
    const tremoloGain = this.ctx.createGain();
    tremolo.frequency.setValueAtTime(6.0, now);
    tremoloGain.gain.setValueAtTime(0.18, now);
    tremolo.connect(tremoloGain.gain);

    const reedOsc = this.ctx.createOscillator();
    reedOsc.type = 'triangle';
    reedOsc.frequency.setValueAtTime(freq, now);

    const biteOsc = this.ctx.createOscillator();
    biteOsc.type = 'sawtooth';
    biteOsc.frequency.setValueAtTime(freq, now);

    const biteGain = this.ctx.createGain();
    biteGain.gain.setValueAtTime(velocity * 0.35, now);
    biteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.85, now + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);

    reedOsc.connect(gainNode);
    biteOsc.connect(reedFilter);
    reedFilter.connect(biteGain);
    biteGain.connect(gainNode);

    reedOsc.start(now);
    biteOsc.start(now);
    tremolo.start(now);

    return () => {
      if (!this.ctx) return;
      const releaseTime = this.ctx.currentTime;
      gainNode.gain.cancelScheduledValues(releaseTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, releaseTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseTime + 0.22);
      setTimeout(() => {
        try {
          reedOsc.stop();
          biteOsc.stop();
          tremolo.stop();
        } catch {
          /* ignore */
        }
      }, 260);
    };
  }

  private synthDX7(
    _midi: number,
    freq: number,
    velocity: number,
    gainNode: GainNode,
    now: number
  ): () => void {
    if (!this.ctx) return () => {};

    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, now);

    const modulator = this.ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(freq * 14.0, now);

    const modIndex = this.ctx.createGain();
    modIndex.gain.setValueAtTime(freq * 2.2 * velocity, now);
    modIndex.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    modulator.connect(modIndex);
    modIndex.connect(carrier.frequency);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.82, now + 0.006);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 6.0);

    carrier.connect(gainNode);
    carrier.start(now);
    modulator.start(now);

    return () => {
      if (!this.ctx) return;
      const releaseTime = this.ctx.currentTime;
      gainNode.gain.cancelScheduledValues(releaseTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, releaseTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseTime + 0.2);
      setTimeout(() => {
        try {
          carrier.stop();
          modulator.stop();
        } catch {
          /* ignore */
        }
      }, 220);
    };
  }

  private synthLoFiTape(
    _midi: number,
    freq: number,
    velocity: number,
    gainNode: GainNode,
    now: number
  ): () => void {
    if (!this.ctx) return () => {};

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(2.8 + Math.random() * 0.8, now);
    lfoGain.gain.setValueAtTime(freq * 0.006, now);
    lfo.connect(lfoGain);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    lfoGain.connect(osc.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.85, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

    osc.connect(filter);
    filter.connect(gainNode);

    lfo.start(now);
    osc.start(now);

    return () => {
      if (!this.ctx) return;
      const releaseTime = this.ctx.currentTime;
      gainNode.gain.cancelScheduledValues(releaseTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, releaseTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseTime + 0.24);
      setTimeout(() => {
        try {
          osc.stop();
          lfo.stop();
        } catch {
          /* ignore */
        }
      }, 280);
    };
  }

  private synthCelesta(
    _midi: number,
    freq: number,
    velocity: number,
    gainNode: GainNode,
    now: number
  ): () => void {
    if (!this.ctx) return () => {};

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq * 2.0, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 5.4, now);

    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(velocity * 0.35, now);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.75, now + 0.004);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

    osc1.connect(gainNode);
    osc2.connect(osc2Gain);
    osc2Gain.connect(gainNode);

    osc1.start(now);
    osc2.start(now);

    return () => {
      if (!this.ctx) return;
      const releaseTime = this.ctx.currentTime;
      gainNode.gain.cancelScheduledValues(releaseTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, releaseTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseTime + 0.15);
      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
        } catch {
          /* ignore */
        }
      }, 200);
    };
  }

  private synthNeonSynth(
    _midi: number,
    freq: number,
    velocity: number,
    gainNode: GainNode,
    now: number
  ): () => void {
    if (!this.ctx) return () => {};

    // 80s Analog Neon Synth with resonant low-pass filter sweep
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4500, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(800, freq * 1.5), now + 0.7);
    filter.Q.setValueAtTime(3.2, now);
    filter.connect(gainNode);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.006, now);

    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq * 0.5, now);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.2, now);
    subOsc.connect(subGain);
    subGain.connect(filter);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.78, now + 0.012);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 5.2);

    osc1.connect(filter);
    osc2.connect(filter);

    osc1.start(now);
    osc2.start(now);
    subOsc.start(now);

    return () => {
      if (!this.ctx) return;
      const releaseTime = this.ctx.currentTime;
      gainNode.gain.cancelScheduledValues(releaseTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, releaseTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseTime + 0.28);
      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
          subOsc.stop();
        } catch {
          /* ignore */
        }
      }, 320);
    };
  }
}

export const pianoEngine = PianoAudioEngine.getInstance();
