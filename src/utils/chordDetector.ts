import type { ChordInfo } from '../types';

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const STANDARD_CHORD_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

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

export function getNoteName(pitchClass: number, useFlats = true): string {
  const pc = ((pitchClass % 12) + 12) % 12;
  return useFlats ? STANDARD_CHORD_ROOTS[pc] : SHARP_NAMES[pc];
}

export function detectChord(midiNotes: number[]): ChordInfo | null {
  if (midiNotes.length === 0) return null;

  // Deduplicate pitch classes
  const uniquePitchClasses = Array.from(new Set(midiNotes.map((n) => ((n % 12) + 12) % 12))).sort((a, b) => a - b);

  if (uniquePitchClasses.length === 1) {
    const rootName = getNoteName(uniquePitchClasses[0]);
    return {
      name: rootName,
      root: rootName,
      type: 'Single Note',
      notes: [rootName],
      midiNotes,
    };
  }

  if (uniquePitchClasses.length === 2) {
    const p1 = uniquePitchClasses[0];
    const p2 = uniquePitchClasses[1];
    const interval = (p2 - p1 + 12) % 12;

    // Check interval relationships
    if (interval === 7) {
      // Perfect 5th: Root is p1
      const rootName = getNoteName(p1);
      return {
        name: `${rootName}5`,
        root: rootName,
        type: 'Power Chord (5th)',
        notes: [rootName, getNoteName(p2)],
        midiNotes,
      };
    } else if (interval === 5) {
      // Perfect 4th: inverted 5th, root is p2
      const rootName = getNoteName(p2);
      return {
        name: `${rootName}5`,
        root: rootName,
        type: 'Power Chord (Inverted)',
        notes: [rootName, getNoteName(p1)],
        midiNotes,
      };
    } else if (interval === 4) {
      // Major 3rd: Major dyad
      const rootName = getNoteName(p1);
      return {
        name: `${rootName}`,
        root: rootName,
        type: 'Major 3rd',
        notes: [rootName, getNoteName(p2)],
        midiNotes,
      };
    } else if (interval === 3) {
      // Minor 3rd: Minor dyad
      const rootName = getNoteName(p1);
      return {
        name: `${rootName}m`,
        root: rootName,
        type: 'Minor 3rd',
        notes: [rootName, getNoteName(p2)],
        midiNotes,
      };
    } else if (interval === 10) {
      // Minor 7th
      const rootName = getNoteName(p1);
      return {
        name: `${rootName}7`,
        root: rootName,
        type: 'Dominant 7th dyad',
        notes: [rootName, getNoteName(p2)],
        midiNotes,
      };
    } else if (interval === 11) {
      // Major 7th
      const rootName = getNoteName(p1);
      return {
        name: `${rootName}maj7`,
        root: rootName,
        type: 'Major 7th dyad',
        notes: [rootName, getNoteName(p2)],
        midiNotes,
      };
    } else if (interval === 2) {
      // Major 2nd: Sus2
      const rootName = getNoteName(p1);
      return {
        name: `${rootName}sus2`,
        root: rootName,
        type: 'Major 2nd',
        notes: [rootName, getNoteName(p2)],
        midiNotes,
      };
    }

    const intervalNames: Record<number, string> = {
      1: 'm2', 6: 'tritone', 8: 'm6', 9: 'M6'
    };
    const rootName = getNoteName(p1);
    return {
      name: `${rootName} (${intervalNames[interval] || 'dyad'})`,
      root: rootName,
      type: intervalNames[interval] || 'Dyad',
      notes: uniquePitchClasses.map(p => getNoteName(p)),
      midiNotes,
    };
  }

  // Check each note as a potential root for triads and extended chords
  for (let r = 0; r < uniquePitchClasses.length; r++) {
    const root = uniquePitchClasses[r];
    const intervals = uniquePitchClasses
      .map((p) => (p - root + 12) % 12)
      .sort((a, b) => a - b);

    for (const chordDef of CHORD_PATTERNS) {
      const defIntervals = chordDef.pattern.slice().sort((a, b) => a - b);
      if (
        defIntervals.length === intervals.length &&
        defIntervals.every((val, idx) => val === intervals[idx])
      ) {
        const rootName = getNoteName(root);
        return {
          name: `${rootName}${chordDef.name}`,
          root: rootName,
          type: chordDef.name || 'Major',
          notes: uniquePitchClasses.map((p) => getNoteName(p)),
          midiNotes,
        };
      }
    }
  }

  // Fallback: estimate from lowest bass note
  const sortedMidi = [...midiNotes].sort((a, b) => a - b);
  const lowestPitch = sortedMidi[0] % 12;
  const rootName = getNoteName(lowestPitch);

  return {
    name: `${rootName} chord`,
    root: rootName,
    type: 'Complex',
    notes: uniquePitchClasses.map((p) => getNoteName(p)),
    midiNotes,
  };
}

export function midiToNoteName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const name = SHARP_NAMES[pc];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

export function isBlackKey(midi: number): boolean {
  const pitchClass = ((midi % 12) + 12) % 12;
  return [1, 3, 6, 8, 10].includes(pitchClass);
}
