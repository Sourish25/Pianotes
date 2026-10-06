import type { NoteEvent, SongData } from '../types';

/**
 * Robust standard MIDI (SMF 0 and 1) file binary parser
 */
export function parseMidiFile(input: ArrayBuffer | Uint8Array, fileName: string = 'Uploaded MIDI'): SongData {
  const isUint8 = input instanceof Uint8Array;
  const buffer = isUint8 ? input.buffer : input;
  const byteOffset = isUint8 ? input.byteOffset : 0;
  const byteLength = isUint8 ? input.byteLength : input.byteLength;
  const data = new DataView(buffer, byteOffset, byteLength);
  let offset = 0;

  function readString(len: number): string {
    let str = '';
    for (let i = 0; i < len; i++) {
      str += String.fromCharCode(data.getUint8(offset++));
    }
    return str;
  }

  function readVarInt(): number {
    let result = 0;
    while (offset < data.byteLength) {
      const byte = data.getUint8(offset++);
      result = (result << 7) | (byte & 0x7f);
      if (!(byte & 0x80)) break;
    }
    return result;
  }

  // 1. Header Chunk 'MThd'
  if (offset + 14 > data.byteLength) {
    throw new Error('Invalid MIDI file: Buffer too small');
  }

  const headerId = readString(4);
  if (headerId !== 'MThd') {
    throw new Error(`Invalid MIDI file header: expected MThd, got ${headerId}`);
  }

  const headerLength = data.getUint32(offset);
  offset += 4;
  offset += 2; // format (0, 1, or 2)
  const numTracks = data.getUint16(offset);
  offset += 2;
  const timeDivision = data.getUint16(offset);
  offset += 2;

  // Skip any extra header bytes if headerLength > 6
  if (headerLength > 6) {
    offset += headerLength - 6;
  }

  const ticksPerQuarterNote = timeDivision & 0x8000 ? 480 : timeDivision;

  // Track raw notes before sorting and converting ticks to seconds
  interface RawNote {
    pitch: number;
    startTick: number;
    durationTicks: number;
    velocity: number;
    track: number;
  }

  const rawNotes: RawNote[] = [];
  const tempoChanges: { tick: number; microsecondsPerQuarter: number }[] = [
    { tick: 0, microsecondsPerQuarter: 500000 }, // Default 120 BPM
  ];

  // 2. Parse Each Track Chunk 'MTrk'
  for (let t = 0; t < numTracks && offset < data.byteLength; t++) {
    if (offset + 8 > data.byteLength) break;

    const trackId = readString(4);
    const trackLength = data.getUint32(offset);
    offset += 4;

    if (trackId !== 'MTrk') {
      offset += trackLength;
      continue;
    }

    const trackEnd = Math.min(offset + trackLength, data.byteLength);
    let currentTick = 0;
    let runningStatus: number | null = null;
    const pendingNotes: Map<number, { startTick: number; velocity: number }> = new Map();

    while (offset < trackEnd) {
      const deltaTick = readVarInt();
      currentTick += deltaTick;

      let eventByte = data.getUint8(offset++);
      if (eventByte < 0x80) {
        if (runningStatus === null) {
          continue;
        }
        offset--;
        eventByte = runningStatus;
      } else {
        runningStatus = eventByte;
      }

      const eventType = eventByte & 0xf0;

      if (eventByte === 0xff) {
        // Meta Event
        const metaType = data.getUint8(offset++);
        const metaLength = readVarInt();

        if (metaType === 0x51 && metaLength === 3) {
          // Set Tempo (microseconds per quarter note)
          const mpqn = (data.getUint8(offset) << 16) | (data.getUint8(offset + 1) << 8) | data.getUint8(offset + 2);
          tempoChanges.push({ tick: currentTick, microsecondsPerQuarter: mpqn });
        } else if (metaType === 0x2f) {
          // End of Track
          offset += metaLength;
          break;
        }
        offset += metaLength;
      } else if (eventByte === 0xf0 || eventByte === 0xf7) {
        // Sysex Event
        const sysexLength = readVarInt();
        offset += sysexLength;
      } else if (eventType === 0x80) {
        // Note Off
        const pitch = data.getUint8(offset++);
        offset++; // velocity byte
        const pending = pendingNotes.get(pitch);
        if (pending) {
          const duration = Math.max(1, currentTick - pending.startTick);
          rawNotes.push({
            pitch,
            startTick: pending.startTick,
            durationTicks: duration,
            velocity: pending.velocity,
            track: t,
          });
          pendingNotes.delete(pitch);
        }
      } else if (eventType === 0x90) {
        // Note On
        const pitch = data.getUint8(offset++);
        const velocity = data.getUint8(offset++);
        if (velocity === 0) {
          // Velocity 0 is Note Off
          const pending = pendingNotes.get(pitch);
          if (pending) {
            const duration = Math.max(1, currentTick - pending.startTick);
            rawNotes.push({
              pitch,
              startTick: pending.startTick,
              durationTicks: duration,
              velocity: pending.velocity,
              track: t,
            });
            pendingNotes.delete(pitch);
          }
        } else {
          // If previous note on same pitch is pending, resolve it first
          const prev = pendingNotes.get(pitch);
          if (prev) {
            rawNotes.push({
              pitch,
              startTick: prev.startTick,
              durationTicks: Math.max(1, currentTick - prev.startTick),
              velocity: prev.velocity,
              track: t,
            });
          }
          pendingNotes.set(pitch, { startTick: currentTick, velocity: Math.min(1.0, velocity / 127) });
        }
      } else if (eventType === 0xa0 || eventType === 0xb0 || eventType === 0xe0) {
        // Aftertouch, Control Change, Pitch Bend (2 data bytes)
        offset += 2;
      } else if (eventType === 0xc0 || eventType === 0xd0) {
        // Program Change, Channel Pressure (1 data byte)
        offset += 1;
      }
    }

    // Flush any unclosed notes at track end
    pendingNotes.forEach((pending, pitch) => {
      rawNotes.push({
        pitch,
        startTick: pending.startTick,
        durationTicks: Math.max(ticksPerQuarterNote, currentTick - pending.startTick),
        velocity: pending.velocity,
        track: t,
      });
    });
  }

  // Sort tempo changes by tick
  tempoChanges.sort((a, b) => a.tick - b.tick);

  // Helper to convert ticks to real-world seconds
  function tickToSeconds(targetTick: number): number {
    let accumulatedSeconds = 0;
    let prevTick = 0;
    let currentMpqn = 500000;

    for (let i = 0; i < tempoChanges.length; i++) {
      const tc = tempoChanges[i];
      if (targetTick <= tc.tick) {
        break;
      }
      const ticksInSpan = tc.tick - prevTick;
      accumulatedSeconds += (ticksInSpan / ticksPerQuarterNote) * (currentMpqn / 1000000);
      prevTick = tc.tick;
      currentMpqn = tc.microsecondsPerQuarter;
    }

    const remainingTicks = targetTick - prevTick;
    accumulatedSeconds += (remainingTicks / ticksPerQuarterNote) * (currentMpqn / 1000000);
    return accumulatedSeconds;
  }

  // Convert raw notes to NoteEvent
  rawNotes.sort((a, b) => a.startTick - b.startTick);

  // Normalize start time so first note starts at ~1.0s for comfortable practice lead-in
  const firstNoteSeconds = rawNotes.length > 0 ? tickToSeconds(rawNotes[0].startTick) : 0;
  const leadInOffset = Math.max(0, 1.2 - firstNoteSeconds);

  let maxEndTime = 0;
  const notes: NoteEvent[] = rawNotes.map((rn, idx) => {
    const startTime = Number((tickToSeconds(rn.startTick) + leadInOffset).toFixed(3));
    const duration = Math.max(0.12, Number(((rn.durationTicks / ticksPerQuarterNote) * 0.5).toFixed(3)));
    const endTime = startTime + duration;
    if (endTime > maxEndTime) maxEndTime = endTime;

    // Biomechanical hand assignment:
    // Bass / accompaniment (< 60) -> left (violet); Melodic / upper register (>= 60) -> right (amber)
    const hand: 'left' | 'right' = rn.pitch < 60 ? 'left' : 'right';

    // Clamp pitch to piano 88-key range: 21 (A0) to 108 (C8)
    const clampedPitch = Math.max(21, Math.min(108, rn.pitch));

    return {
      id: `imported-midi-${idx}`,
      pitch: clampedPitch,
      startTime,
      duration,
      velocity: Math.max(0.3, Math.min(1.0, rn.velocity)),
      hand,
    };
  });

  const cleanTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const primaryBpm = Math.round(60000000 / (tempoChanges[0]?.microsecondsPerQuarter || 500000));

  return {
    id: `midi-file-${Date.now()}`,
    title: cleanTitle || 'Imported MIDI Performance',
    composer: 'Imported Score',
    bpm: primaryBpm,
    duration: Math.ceil(maxEndTime + 2),
    keySignature: 'Imported',
    difficulty: notes.length > 100 ? 'Virtuoso' : 'Intermediate',
    description: `Parsed from ${fileName} with ${notes.length} notes, dual-hand separation, and accurate SMF timing.`,
    notes,
  };
}
