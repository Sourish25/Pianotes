/**
 * Web MIDI API Manager for USB / Bluetooth Physical Piano Keyboards
 */

interface MIDIMessageEventLike {
  data: Uint8Array | null;
}

interface MIDIInputLike {
  name?: string;
  onmidimessage: ((event: MIDIMessageEventLike) => void) | null;
}

interface MIDIAccessLike {
  inputs: {
    values: () => IterableIterator<MIDIInputLike>;
  };
  onstatechange: (() => void) | null;
}

export class WebMidiManager {
  private midiAccess: MIDIAccessLike | null = null;
  private isSupported = false;
  private connectedDeviceName: string | null = null;

  private onNoteOnCallback: ((pitch: number, velocity: number) => void) | null = null;
  private onNoteOffCallback: ((pitch: number) => void) | null = null;
  private onSustainCallback: ((isDown: boolean) => void) | null = null;
  private onDeviceChangeCallback: ((deviceName: string | null) => void) | null = null;

  constructor() {
    this.isSupported =
      typeof navigator !== 'undefined' &&
      typeof (navigator as unknown as { requestMIDIAccess?: unknown }).requestMIDIAccess === 'function';
  }

  public async init(
    onNoteOn: (pitch: number, velocity: number) => void,
    onNoteOff: (pitch: number) => void,
    onSustain: (isDown: boolean) => void,
    onDeviceChange?: (deviceName: string | null) => void
  ): Promise<boolean> {
    this.onNoteOnCallback = onNoteOn;
    this.onNoteOffCallback = onNoteOff;
    this.onSustainCallback = onSustain;
    this.onDeviceChangeCallback = onDeviceChange || null;

    if (!this.isSupported) {
      return false;
    }

    try {
      const nav = navigator as unknown as {
        requestMIDIAccess: (options?: { sysex?: boolean }) => Promise<MIDIAccessLike>;
      };
      this.midiAccess = await nav.requestMIDIAccess({ sysex: false });
      this.setupInputs();
      this.midiAccess.onstatechange = () => {
        this.setupInputs();
      };
      return true;
    } catch (err) {
      console.warn('Web MIDI API access not granted or not supported:', err);
      return false;
    }
  }

  private setupInputs() {
    if (!this.midiAccess) return;

    let firstDeviceName: string | null = null;
    const inputs = this.midiAccess.inputs.values();

    for (const input of inputs) {
      if (!firstDeviceName && input.name) {
        firstDeviceName = input.name;
      }
      input.onmidimessage = (event: MIDIMessageEventLike) => {
        this.handleMidiMessage(event.data);
      };
    }

    this.connectedDeviceName = firstDeviceName;
    if (this.onDeviceChangeCallback) {
      this.onDeviceChangeCallback(this.connectedDeviceName);
    }
  }

  private handleMidiMessage(data: Uint8Array | null) {
    if (!data || data.length < 2) return;

    const status = data[0];
    const command = status & 0xf0;
    const note = data[1];
    const velocity = data.length > 2 ? data[2] : 0;

    if (command === 0x90 && velocity > 0) {
      // Note On
      if (this.onNoteOnCallback && note >= 21 && note <= 108) {
        this.onNoteOnCallback(note, velocity / 127);
      }
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      // Note Off
      if (this.onNoteOffCallback && note >= 21 && note <= 108) {
        this.onNoteOffCallback(note);
      }
    } else if (command === 0xb0 && note === 64) {
      // CC 64: Sustain Pedal
      const isDown = velocity >= 64;
      if (this.onSustainCallback) {
        this.onSustainCallback(isDown);
      }
    }
  }

  public getConnectedDevice(): string | null {
    return this.connectedDeviceName;
  }

  public isAvailable(): boolean {
    return this.isSupported;
  }
}

export const webMidiManager = new WebMidiManager();
