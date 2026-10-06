import type { NoteEvent } from '../types';

/**
 * Encodes a non-negative integer as a MIDI Variable-Length Quantity (VLQ).
 */
export function encodeVarInt(value: number): number[] {
  let val = Math.floor(Math.max(0, value));
  const bytes: number[] = [val & 0x7f];
  val = val >> 7;
  while (val > 0) {
    bytes.unshift((val & 0x7f) | 0x80);
    val = val >> 7;
  }
  return bytes;
}

interface RawMidiNoteEvent {
  tick: number;
  type: 'on' | 'off';
  pitch: number;
  velocity: number;
}

/**
 * Generates a valid Standard MIDI File (SMF Format 0, 480 PPQ) binary buffer.
 */
export function generateMidiBinary(
  notes: NoteEvent[],
  bpm: number = 120,
  title: string = 'Pianotes Recording'
): Uint8Array {
  const ticksPerBeat = 480;
  const safeBpm = Math.max(20, Math.min(300, bpm || 120));
  const ticksPerSecond = (ticksPerBeat * safeBpm) / 60;

  // Flatten note events into separate NoteOn and NoteOff events
  const events: RawMidiNoteEvent[] = [];
  notes.forEach((n) => {
    const startTick = Math.max(0, Math.round(n.startTime * ticksPerSecond));
    const durationTicks = Math.max(1, Math.round(n.duration * ticksPerSecond));
    const endTick = startTick + durationTicks;
    const vel = Math.max(1, Math.min(127, Math.round(n.velocity * 127)));

    events.push({
      tick: startTick,
      type: 'on',
      pitch: Math.max(21, Math.min(108, n.pitch)),
      velocity: vel,
    });

    events.push({
      tick: endTick,
      type: 'off',
      pitch: Math.max(21, Math.min(108, n.pitch)),
      velocity: 0,
    });
  });

  // Sort events chronologically. For identical ticks, note-off goes before note-on
  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type !== b.type) return a.type === 'off' ? -1 : 1;
    return a.pitch - b.pitch;
  });

  const trackBytes: number[] = [];

  // 1. Meta Event: Set Tempo (0x51)
  // microsecondsPerQuarterNote = 60,000,000 / BPM
  const mpq = Math.round(60000000 / safeBpm);
  trackBytes.push(...encodeVarInt(0)); // delta 0
  trackBytes.push(0xff, 0x51, 0x03);
  trackBytes.push((mpq >> 16) & 0xff, (mpq >> 8) & 0xff, mpq & 0xff);

  // 2. Meta Event: Track/Sequence Name (0x03)
  if (title) {
    const titleBytes: number[] = [];
    for (let i = 0; i < title.length; i++) {
      titleBytes.push(title.charCodeAt(i) & 0x7f);
    }
    trackBytes.push(...encodeVarInt(0)); // delta 0
    trackBytes.push(0xff, 0x03);
    trackBytes.push(...encodeVarInt(titleBytes.length));
    trackBytes.push(...titleBytes);
  }

  // 3. Serialize Note Events with delta ticks
  let lastTick = 0;
  events.forEach((ev) => {
    const delta = Math.max(0, ev.tick - lastTick);
    lastTick = ev.tick;
    trackBytes.push(...encodeVarInt(delta));

    if (ev.type === 'on') {
      trackBytes.push(0x90, ev.pitch, ev.velocity);
    } else {
      trackBytes.push(0x80, ev.pitch, 0x00);
    }
  });

  // 4. Meta Event: End of Track (0x2F)
  trackBytes.push(...encodeVarInt(0));
  trackBytes.push(0xff, 0x2f, 0x00);

  // Assemble full SMF binary
  const totalLength = 14 + 8 + trackBytes.length;
  const buffer = new Uint8Array(totalLength);
  const view = new DataView(buffer.buffer);

  // MThd Header Chunk
  buffer[0] = 0x4d; // 'M'
  buffer[1] = 0x54; // 'T'
  buffer[2] = 0x68; // 'h'
  buffer[3] = 0x64; // 'd'
  view.setUint32(4, 6, false); // Header length 6
  view.setUint16(8, 0, false); // Format 0 (single track)
  view.setUint16(10, 1, false); // 1 track
  view.setUint16(12, ticksPerBeat, false); // 480 PPQ

  // MTrk Track Chunk
  buffer[14] = 0x4d; // 'M'
  buffer[15] = 0x54; // 'T'
  buffer[16] = 0x72; // 'r'
  buffer[17] = 0x6b; // 'k'
  view.setUint32(18, trackBytes.length, false);

  // Copy track data
  buffer.set(trackBytes, 22);

  return buffer;
}

/**
 * Triggers a browser download of the generated standard MIDI binary file.
 */
export function downloadMidiFile(
  notes: NoteEvent[],
  bpm: number = 120,
  title: string = 'pianotes_performance'
): void {
  const binary = generateMidiBinary(notes, bpm, title);
  const bufferSlice = binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength) as ArrayBuffer;
  const blob = new Blob([bufferSlice], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = title.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  a.download = `${safeName || 'pianotes_performance'}.mid`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
