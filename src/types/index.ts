export type HandType = 'left' | 'right' | 'both';

export type InstrumentType =
  | 'concert-grand'
  | 'upright'
  | 'neo-rhodes'
  | 'dx7-ep'
  | 'lofi-tape'
  | 'celesta';

export interface NoteEvent {
  id: string;
  pitch: number; // MIDI note number 21 (A0) to 108 (C8)
  startTime: number; // in seconds
  duration: number; // in seconds
  hand: 'left' | 'right';
  velocity: number; // 0.0 to 1.0
}

export interface SongData {
  id: string;
  title: string;
  composer: string;
  bpm: number;
  duration: number; // in seconds
  keySignature: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Virtuoso';
  notes: NoteEvent[];
  description: string;
}

export interface ChordInfo {
  name: string;
  root: string;
  type: string;
  notes: string[];
  midiNotes: number[];
}

export type ViewportMode = 'waterfall3d' | 'piano2d' | 'dual';
