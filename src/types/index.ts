export type HandType = 'left' | 'right' | 'both';

export type InstrumentType =
  | 'concert-grand'
  | 'upright'
  | 'felt'
  | 'neo-rhodes'
  | 'wurlitzer'
  | 'dx7-ep'
  | 'lofi-tape'
  | 'celesta'
  | 'neon-synth';

export interface DSPSettings {
  reverb: boolean;
  reverbWet: number;
  reverbDecay?: number;
  reverbDampening?: number;
  chorus: boolean;
  chorusDepth: number;
  chorusRate?: number;
  delay: boolean;
  delayFeedback: number;
  tapeDrive: boolean;
  driveAmount: number;
}

export interface NoteEvent {
  id: string;
  pitch: number; // MIDI note number 21 (A0) to 108 (C8)
  startTime: number; // in seconds
  duration: number; // in seconds
  hand: 'left' | 'right';
  velocity: number; // 0.0 to 1.0
}

export type SongCategory = 'Classical' | 'Cinematic' | 'Neo-Soul' | 'Lo-Fi' | 'Anime';

export interface SongData {
  id: string;
  title: string;
  composer: string;
  bpm: number;
  duration: number; // in seconds
  keySignature: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Virtuoso';
  category?: SongCategory;
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

export type ConcertPitch = 440 | 432 | 442 | 415;

export type StrikeRating = 'PERFECT' | 'GREAT' | 'EARLY' | 'LATE' | 'MISS';

export interface StrikeFeedback {
  id: string;
  rating: StrikeRating;
  points: number;
  offsetMs: number;
  timestamp: number;
  pitch: number;
  combo: number;
  multiplier: number;
}

export interface PerformanceScore {
  score: number;
  streak: number;
  maxStreak: number;
  multiplier: number;
  perfectCount: number;
  greatCount: number;
  earlyCount: number;
  lateCount: number;
  missCount: number;
  totalNotes: number;
  accuracy: number; // 0 to 100%
}

export type MetronomeTimeSignature = '4/4' | '3/4' | '6/8';

export interface MetronomeConfig {
  enabled: boolean;
  bpm: number;
  timeSignature: MetronomeTimeSignature;
  volume: number; // 0.0 to 1.0
}

export interface RecordingSession {
  id: string;
  title: string;
  createdAt: number;
  notes: NoteEvent[];
  duration: number;
  bpm: number;
}
