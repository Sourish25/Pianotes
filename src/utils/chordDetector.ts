import type { ChordInfo } from '../types';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface ChordPattern {
  name: string;
  pattern: number[]; // semitone intervals from root
}

const CHORD_PATTERNS: ChordPattern[] = [
  // Triads
  { name: '', pattern: [0, 4, 7] }, // Major
  { name: 'm', pattern: [0, 3, 7] }, // Minor
  { name: 'dim', pattern: [0, 3, 6] }, // Diminished
  { name: 'aug', pattern: [0, 4, 8] }, // Augmented
  { name: 'sus4', pattern: [0, 5, 7] }, // Suspended 4
  { name: 'sus2', pattern: [0, 2, 7] }, // Suspended 2
  // 7ths
  { name: 'maj7', pattern: [0, 4, 7, 11] }, // Major 7
  { name: '7', pattern: [0, 4, 7, 10] }, // Dominant 7
  { name: 'm7', pattern: [0, 3, 7, 10] }, // Minor 7
  { name: 'm(maj7)', pattern: [0, 3, 7, 11] }, // Minor Major 7
  { name: 'm7b5', pattern: [0, 3, 6, 10] }, // Half-diminished
  { name: 'dim7', pattern: [0, 3, 6, 9] }, // Diminished 7
  // Extensions
  { name: 'add9', pattern: [0, 2, 4, 7] },
  { name: 'm(add9)', pattern: [0, 2, 3, 7] },
  { name: '9', pattern: [0, 2, 4, 7, 10] },
  { name: 'maj9', pattern: [0, 2, 4, 7, 11] },
  { name: 'm9', pattern: [0, 2, 3, 7, 10] },
];

export function detectChord(midiNotes: number[]): ChordInfo | null {
  if (midiNotes.length === 0) return null;

  // Deduplicate pitch classes
  const uniquePitchClasses = Array.from(new Set(midiNotes.map((n) => n % 12))).sort((a, b) => a - b);

  if (uniquePitchClasses.length === 1) {
    const rootName = NOTE_NAMES[uniquePitchClasses[0]];
    return {
      name: rootName,
      root: rootName,
      type: 'Single Note',
      notes: [rootName],
      midiNotes,
    };
  }

  if (uniquePitchClasses.length === 2) {
    const root = uniquePitchClasses[0];
    const second = uniquePitchClasses[1];
    const interval = (second - root + 12) % 12;
    const intervalNames: Record<number, string> = {
      1: 'm2', 2: 'M2', 3: 'm3', 4: 'M3', 5: 'P4', 6: 'tritone', 7: 'P5 (Power)', 8: 'm6', 9: 'M6', 10: 'm7', 11: 'M7'
    };
    const rootName = NOTE_NAMES[root];
    return {
      name: `${rootName}5`,
      root: rootName,
      type: intervalNames[interval] || 'Dyad',
      notes: uniquePitchClasses.map(p => NOTE_NAMES[p]),
      midiNotes,
    };
  }

  // Check each note as a potential root
  for (let r = 0; r < uniquePitchClasses.length; r++) {
    const root = uniquePitchClasses[r];
    const intervals = uniquePitchClasses
      .map((p) => (p - root + 12) % 12)
      .sort((a, b) => a - b);

    for (const chordDef of CHORD_PATTERNS) {
      // Check if intervals match chord definition
      const defIntervals = chordDef.pattern.slice().sort((a, b) => a - b);
      if (
        defIntervals.length === intervals.length &&
        defIntervals.every((val, idx) => val === intervals[idx])
      ) {
        const rootName = NOTE_NAMES[root];
        return {
          name: `${rootName}${chordDef.name}`,
          root: rootName,
          type: chordDef.name || 'Major',
          notes: uniquePitchClasses.map((p) => NOTE_NAMES[p]),
          midiNotes,
        };
      }
    }
  }

  // Fallback: estimate from lowest note
  const sortedMidi = [...midiNotes].sort((a, b) => a - b);
  const lowestPitch = sortedMidi[0] % 12;
  const rootName = NOTE_NAMES[lowestPitch];

  return {
    name: `${rootName} chord`,
    root: rootName,
    type: 'Complex',
    notes: uniquePitchClasses.map((p) => NOTE_NAMES[p]),
    midiNotes,
  };
}

export function midiToNoteName(midi: number): string {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

export function isBlackKey(midi: number): boolean {
  const pitchClass = midi % 12;
  return [1, 3, 6, 8, 10].includes(pitchClass);
}
