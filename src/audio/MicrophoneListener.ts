// Real-time acoustic piano pitch detection using autocorrelation
export class MicrophoneListener {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private isListening = false;
  private animationFrameId: number | null = null;
  private onPitchDetected: ((midi: number, noteName: string, frequency: number) => void) | null = null;
  private onLevelUpdate: ((level: number) => void) | null = null;

  public async start(
    onPitch: (midi: number, noteName: string, frequency: number) => void,
    onLevel?: (level: number) => void
  ): Promise<boolean> {
    try {
      this.onPitchDetected = onPitch;
      this.onLevelUpdate = onLevel || null;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        },
      });

      const source = this.audioCtx.createMediaStreamSource(this.mediaStream);

      // Acoustic Lowpass Filter (2400Hz) to suppress ultrasonic string hammer transient clicks
      const lowpass = this.audioCtx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(2400, this.audioCtx.currentTime);

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;

      source.connect(lowpass);
      lowpass.connect(this.analyser);

      this.buffer = new Float32Array(this.analyser.fftSize);
      this.isListening = true;

      this.analyzeLoop();
      return true;
    } catch (err) {
      console.error('Microphone access failed:', err);
      return false;
    }
  }

  public stop() {
    this.isListening = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  public isActive(): boolean {
    return this.isListening;
  }

  private analyzeLoop = () => {
    if (!this.isListening || !this.analyser || !this.buffer) return;

    this.analyser.getFloatTimeDomainData(this.buffer);

    // Compute RMS audio level
    let sumSquares = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      sumSquares += this.buffer[i] * this.buffer[i];
    }
    const rms = Math.sqrt(sumSquares / this.buffer.length);
    if (this.onLevelUpdate) {
      this.onLevelUpdate(Math.min(1, rms * 5));
    }

    // Only detect pitch if signal is above noise threshold
    if (rms > 0.02) {
      const freq = this.autoCorrelate(this.buffer, this.audioCtx?.sampleRate || 44100);
      if (freq > 27.5 && freq < 4200) { // Piano frequency range A0 to C8
        const midi = Math.round(69 + 12 * Math.log2(freq / 440));
        if (midi >= 21 && midi <= 108) {
          const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
          const noteName = `${noteNames[midi % 12]}${Math.floor(midi / 12) - 1}`;
          if (this.onPitchDetected) {
            this.onPitchDetected(midi, noteName, freq);
          }
        }
      }
    }

    this.animationFrameId = requestAnimationFrame(this.analyzeLoop);
  };

  private autoCorrelate(buf: Float32Array<ArrayBuffer>, sampleRate: number): number {
    const size = buf.length;
    let r1 = 0;
    let r2 = size - 1;
    const thres = 0.2;

    for (let i = 0; i < size / 2; i++) {
      if (Math.abs(buf[i]) < thres) {
        r1 = i;
        break;
      }
    }
    for (let i = 1; i < size / 2; i++) {
      if (Math.abs(buf[size - i]) < thres) {
        r2 = size - i;
        break;
      }
    }

    const trimmedBuf = buf.slice(r1, r2);
    const c = new Float32Array(trimmedBuf.length).fill(0);

    for (let i = 0; i < trimmedBuf.length; i++) {
      for (let j = 0; j < trimmedBuf.length - i; j++) {
        c[i] = c[i] + trimmedBuf[j] * trimmedBuf[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1;
    let maxpos = -1;
    for (let i = d; i < trimmedBuf.length; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }

    let T0 = maxpos;
    if (maxpos > 0 && maxval > 0) {
      T0 = this.suppressOvertones(c, maxpos, maxval, sampleRate);
    }

    if (T0 > 0 && T0 < trimmedBuf.length - 1) {
      const x1 = c[Math.floor(T0) - 1] ?? c[0];
      const x2 = c[Math.floor(T0)] ?? c[0];
      const x3 = c[Math.floor(T0) + 1] ?? c[0];
      const a = (x1 + x3 - 2 * x2) / 2;
      const b = (x3 - x1) / 2;
      if (a) {
        T0 = T0 - b / (2 * a);
      }
    }

    return sampleRate / T0;
  }

  /**
   * Overtone Suppression:
   * Inspects if candidate T0 (period) is actually an overtone (e.g. 2nd or 3rd harmonic).
   * In pianos, the 2nd harmonic (octave higher) or 3rd harmonic can often have higher amplitude
   * than the fundamental. By inspecting c[2 * T0] and c[3 * T0], if a sub-harmonic peak has
   * substantial correlation (>= 72%), we choose the sub-harmonic (lower frequency fundamental).
   */
  public suppressOvertones(
    c: Float32Array,
    candidatePeriod: number,
    maxVal: number,
    sampleRate: number
  ): number {
    if (candidatePeriod <= 0 || maxVal <= 0) return candidatePeriod;

    // Check 2x period (octave lower fundamental)
    const doublePeriod = Math.round(candidatePeriod * 2);
    if (doublePeriod < c.length - 2) {
      let localMax = -1;
      let localPos = doublePeriod;
      for (let offset = -4; offset <= 4; offset++) {
        const idx = doublePeriod + offset;
        if (idx >= 0 && idx < c.length && c[idx] > localMax) {
          localMax = c[idx];
          localPos = idx;
        }
      }

      const fundFreq = sampleRate / localPos;
      if (localMax >= maxVal * 0.72 && fundFreq >= 27.5) {
        return localPos;
      }
    }

    // Check 3rd harmonic (3x period) for lower registers
    const triplePeriod = Math.round(candidatePeriod * 3);
    if (triplePeriod < c.length - 2) {
      let localMax = -1;
      let localPos = triplePeriod;
      for (let offset = -4; offset <= 4; offset++) {
        const idx = triplePeriod + offset;
        if (idx >= 0 && idx < c.length && c[idx] > localMax) {
          localMax = c[idx];
          localPos = idx;
        }
      }

      const fundFreq = sampleRate / localPos;
      if (localMax >= maxVal * 0.75 && fundFreq >= 27.5) {
        return localPos;
      }
    }

    return candidatePeriod;
  }
}

export const micListener = new MicrophoneListener();
