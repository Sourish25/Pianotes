import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { detectChord, midiToNoteName, isBlackKey } from '../utils/chordDetector';
import { SAMPLE_SONGS } from '../data/songs';
import { pianoEngine } from '../audio/PianoEngine';
import { calculateKeyTouchVelocity } from '../utils/touchVelocity';
import { countInEngine } from '../audio/CountInEngine';
import { micListener } from '../audio/MicrophoneListener';
import {
  evaluateStrikeTiming,
  getComboMultiplier,
  calculateAccuracy,
  calculateStarRating,
  ScoreKeeper,
} from '../utils/scoringSystem';
import { encodeVarInt, generateMidiBinary } from '../utils/midiWriter';
import { parseMidiFile } from '../utils/midiParser';

describe('Chord Detection & Musical Theory', () => {
  it('correctly identifies single notes', () => {
    const chord = detectChord([60]); // C4
    expect(chord).not.toBeNull();
    expect(chord?.name).toBe('C');
    expect(chord?.type).toBe('Single Note');
  });

  it('correctly identifies major triads', () => {
    const cMajor = detectChord([60, 64, 67]); // C - E - G
    expect(cMajor).not.toBeNull();
    expect(cMajor?.name).toBe('C');

    const fMajor = detectChord([53, 57, 60]); // F - A - C
    expect(fMajor).not.toBeNull();
    expect(fMajor?.name).toBe('F');
  });

  it('correctly identifies minor triads', () => {
    const aMinor = detectChord([57, 60, 64]); // A - C - E
    expect(aMinor).not.toBeNull();
    expect(aMinor?.name).toBe('Am');

    const fMinor = detectChord([65, 68, 72]); // F - Ab - C
    expect(fMinor).not.toBeNull();
    expect(fMinor?.name).toBe('Fm');
  });

  it('correctly identifies 7th chords', () => {
    const cMaj7 = detectChord([60, 64, 67, 71]); // C - E - G - B
    expect(cMaj7).not.toBeNull();
    expect(cMaj7?.name).toBe('Cmaj7');

    const aMin7 = detectChord([57, 60, 64, 67]); // A - C - E - G
    expect(aMin7).not.toBeNull();
    expect(aMin7?.name).toBe('Am7');

    const g7 = detectChord([55, 59, 62, 65]); // G - B - D - F
    expect(g7).not.toBeNull();
    expect(g7?.name).toBe('G7');
  });

  it('correctly handles two-note intervals / dyads and power chords', () => {
    const powerChord = detectChord([60, 67]); // C - G (Perfect 5th)
    expect(powerChord).not.toBeNull();
    expect(powerChord?.name).toBe('C5');

    const invertedFifth = detectChord([55, 60]); // G - C (4th / inverted 5th)
    expect(invertedFifth).not.toBeNull();
    expect(invertedFifth?.name).toBe('C5');

    const majorDyad = detectChord([60, 64]); // C - E (Major 3rd)
    expect(majorDyad).not.toBeNull();
    expect(majorDyad?.name).toBe('C');

    const minorDyad = detectChord([60, 63]); // C - Eb (Minor 3rd)
    expect(minorDyad).not.toBeNull();
    expect(minorDyad?.name).toBe('Cm');

    const dom7Dyad = detectChord([60, 70]); // C - Bb (Minor 7th)
    expect(dom7Dyad).not.toBeNull();
    expect(dom7Dyad?.name).toBe('C7');
  });

  it('correctly recognizes flat chord symbols (Ab, Bb, Fm, Eb)', () => {
    const abMajor = detectChord([56, 60, 63]); // Ab - C - Eb
    expect(abMajor).not.toBeNull();
    expect(abMajor?.name).toBe('Ab');

    const bbMajor = detectChord([58, 62, 65]); // Bb - D - F
    expect(bbMajor).not.toBeNull();
    expect(bbMajor?.name).toBe('Bb');

    const fMinor = detectChord([53, 56, 60]); // F - Ab - C
    expect(fMinor).not.toBeNull();
    expect(fMinor?.name).toBe('Fm');

    const ebMajor = detectChord([51, 55, 58]); // Eb - G - Bb
    expect(ebMajor).not.toBeNull();
    expect(ebMajor?.name).toBe('Eb');
  });

  it('handles octave inversions and duplicates properly', () => {
    // Inverted C Major with octave bass: C2 (36), G3 (55), E4 (64), C5 (72)
    const invertedC = detectChord([36, 55, 64, 72]);
    expect(invertedC).not.toBeNull();
    expect(invertedC?.name).toBe('C');
  });

  it('handles empty input gracefully', () => {
    const empty = detectChord([]);
    expect(empty).toBeNull();
  });
});

describe('Note Name and Key Classification', () => {
  it('correctly maps MIDI numbers to note names and octaves', () => {
    expect(midiToNoteName(21)).toBe('A0');
    expect(midiToNoteName(60)).toBe('C4'); // Middle C
    expect(midiToNoteName(69)).toBe('A4'); // Concert Pitch 440Hz
    expect(midiToNoteName(108)).toBe('C8'); // High C
  });

  it('accurately identifies black vs white piano keys', () => {
    // White keys
    expect(isBlackKey(60)).toBe(false); // C4
    expect(isBlackKey(62)).toBe(false); // D4
    expect(isBlackKey(64)).toBe(false); // E4
    expect(isBlackKey(65)).toBe(false); // F4

    // Black keys (accidentals)
    expect(isBlackKey(61)).toBe(true); // C#4
    expect(isBlackKey(63)).toBe(true); // D#4
    expect(isBlackKey(66)).toBe(true); // F#4
    expect(isBlackKey(68)).toBe(true); // G#4
    expect(isBlackKey(70)).toBe(true); // A#4
  });
});

describe('Song Data Integrity', () => {
  it('contains verified sample pieces with valid note events', () => {
    expect(SAMPLE_SONGS.length).toBeGreaterThanOrEqual(5);

    for (const song of SAMPLE_SONGS) {
      expect(song.title).toBeTruthy();
      expect(song.duration).toBeGreaterThan(0);
      expect(song.notes.length).toBeGreaterThan(10);

      // Verify hand separation
      const leftHandNotes = song.notes.filter((n) => n.hand === 'left');
      const rightHandNotes = song.notes.filter((n) => n.hand === 'right');
      expect(leftHandNotes.length).toBeGreaterThan(0);
      expect(rightHandNotes.length).toBeGreaterThan(0);

      // Verify valid MIDI ranges (88 keys: 21 to 108)
      for (const note of song.notes) {
        expect(note.pitch).toBeGreaterThanOrEqual(21);
        expect(note.pitch).toBeLessThanOrEqual(108);
        expect(note.duration).toBeGreaterThan(0);
        expect(note.velocity).toBeGreaterThan(0);
        expect(note.velocity).toBeLessThanOrEqual(1.0);
      }
    }
  });
});

describe('Piano Audio Engine & DSP Rack', () => {
  it('accurately computes 12-TET equal temperament musical frequencies', () => {
    // A4 = 440 Hz
    expect(pianoEngine.midiToFrequency(69)).toBeCloseTo(440.0, 1);
    // A3 = 220 Hz
    expect(pianoEngine.midiToFrequency(57)).toBeCloseTo(220.0, 1);
    // Middle C (C4) ≈ 261.63 Hz
    expect(pianoEngine.midiToFrequency(60)).toBeCloseTo(261.63, 1);
    // A0 (lowest piano key) ≈ 27.5 Hz
    expect(pianoEngine.midiToFrequency(21)).toBeCloseTo(27.5, 1);
    // C8 (highest piano key) ≈ 4186 Hz
    expect(pianoEngine.midiToFrequency(108)).toBeCloseTo(4186.0, 0);
  });

  it('supports all 9 instrument synthesis profiles', () => {
    const instruments = [
      'concert-grand',
      'upright',
      'felt',
      'neo-rhodes',
      'wurlitzer',
      'dx7-ep',
      'lofi-tape',
      'celesta',
      'neon-synth',
    ] as const;

    instruments.forEach((inst) => {
      pianoEngine.setInstrument(inst);
      expect(pianoEngine.getInstrument()).toBe(inst);
    });
  });

  it('handles sustain pedal latch state', () => {
    pianoEngine.setSustainPedal(false);
    expect(pianoEngine.isSustainPedalDown()).toBe(false);

    pianoEngine.setSustainPedal(true);
    expect(pianoEngine.isSustainPedalDown()).toBe(true);

    pianoEngine.setSustainPedal(false);
    expect(pianoEngine.isSustainPedalDown()).toBe(false);
  });

  it('correctly configures and updates 4-stage DSP effects rack', () => {
    const initialDSP = pianoEngine.getDSPSettings();
    expect(initialDSP).toHaveProperty('reverb');
    expect(initialDSP).toHaveProperty('chorus');
    expect(initialDSP).toHaveProperty('delay');
    expect(initialDSP).toHaveProperty('tapeDrive');

    pianoEngine.updateDSPSettings({
      chorus: true,
      chorusDepth: 0.8,
      delay: true,
      delayFeedback: 0.5,
      tapeDrive: true,
      driveAmount: 0.6,
    });

    const updatedDSP = pianoEngine.getDSPSettings();
    expect(updatedDSP.chorus).toBe(true);
    expect(updatedDSP.chorusDepth).toBe(0.8);
    expect(updatedDSP.delay).toBe(true);
    expect(updatedDSP.delayFeedback).toBe(0.5);
    expect(updatedDSP.tapeDrive).toBe(true);
    expect(updatedDSP.driveAmount).toBe(0.6);
  });
});

describe('Standard MIDI Binary Parser', () => {
  // Helper to generate a minimal valid Standard MIDI File buffer (format 0, 1 track, 480 ticks/beat)
  function createMinimalMidiBuffer(): ArrayBuffer {
    const bytes: number[] = [
      // MThd Header
      0x4d, 0x54, 0x68, 0x64, // 'MThd'
      0x00, 0x00, 0x00, 0x06, // length 6
      0x00, 0x00,             // format 0
      0x00, 0x01,             // 1 track
      0x01, 0xe0,             // 480 ticks/beat
      // MTrk Track
      0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
      0x00, 0x00, 0x00, 0x18, // length 24 bytes
      // Event 1: Note On C4 (pitch 60, vel 80, delta 0)
      0x00, 0x90, 0x3c, 0x50,
      // Event 2: Note Off C4 (pitch 60, vel 0, delta 480 ticks)
      0x83, 0x60, 0x80, 0x3c, 0x00,
      // Event 3: Note On G3 (pitch 55 - left hand, vel 70, delta 0)
      0x00, 0x90, 0x37, 0x46,
      // Event 4: Note Off G3 (pitch 55, vel 0, delta 480 ticks)
      0x83, 0x60, 0x80, 0x37, 0x00,
      // End of Track Meta Event
      0x00, 0xff, 0x2f, 0x00,
    ];

    const buffer = new ArrayBuffer(bytes.length);
    const view = new Uint8Array(buffer);
    bytes.forEach((b, i) => (view[i] = b));
    return buffer;
  }

  it('correctly parses binary MIDI files into SongData structures', async () => {
    const { parseMidiFile } = await import('../utils/midiParser');
    const buffer = createMinimalMidiBuffer();
    const song = parseMidiFile(buffer, 'test_composition.mid');

    expect(song.title).toBe('test composition');
    expect(song.notes.length).toBe(2);

    // Verify first note C4 (right hand amber)
    const c4 = song.notes.find((n) => n.pitch === 60);
    expect(c4).toBeDefined();
    expect(c4?.hand).toBe('right');
    expect(c4?.velocity).toBeCloseTo(80 / 127, 2);

    // Verify second note G3 (left hand violet)
    const g3 = song.notes.find((n) => n.pitch === 55);
    expect(g3).toBeDefined();
    expect(g3?.hand).toBe('left');
  });

  it('safely rejects corrupt or invalid MIDI buffers', async () => {
    const { parseMidiFile } = await import('../utils/midiParser');
    const badBuffer = new ArrayBuffer(8); // Too small
    expect(() => parseMidiFile(badBuffer, 'corrupt.mid')).toThrow();
  });
});

describe('Wait-for-Me Practice Mode Mechanics', () => {
  it('advances past satisfied notes without deadlock when user plays key', () => {
    // Simulate interactive score progression
    const sampleNotes = [
      { id: 'n1', pitch: 60, startTime: 1.0, duration: 0.5, velocity: 0.8, hand: 'right' as const },
      { id: 'n2', pitch: 64, startTime: 2.0, duration: 0.5, velocity: 0.8, hand: 'right' as const },
    ];

    const satisfiedNoteIds = new Set<string>();
    const userPlayedKeys = new Set<number>();

    function checkWaitState(currentTime: number, nextTime: number) {
      const eligibleNotes = sampleNotes.filter(
        (n) => n.startTime <= nextTime && !satisfiedNoteIds.has(n.id)
      );

      eligibleNotes.forEach((n) => {
        if (userPlayedKeys.has(n.pitch)) {
          satisfiedNoteIds.add(n.id);
        }
      });

      const remainingUnsatisfied = eligibleNotes.filter((n) => !satisfiedNoteIds.has(n.id));
      if (remainingUnsatisfied.length > 0) {
        return { isWaiting: true, waitingPitch: remainingUnsatisfied[0].pitch, nextTime: Math.min(currentTime, remainingUnsatisfied[0].startTime) };
      }
      return { isWaiting: false, waitingPitch: null, nextTime };
    }

    // Step 1: Clock reaches strike time of note 1 (1.0s)
    let state = checkWaitState(0.98, 1.02);
    expect(state.isWaiting).toBe(true);
    expect(state.waitingPitch).toBe(60);
    expect(state.nextTime).toBe(0.98); // Paused!

    // Step 2: User plays key 60!
    userPlayedKeys.add(60);
    state = checkWaitState(0.98, 1.02);
    expect(state.isWaiting).toBe(false);
    expect(satisfiedNoteIds.has('n1')).toBe(true);

    // Step 3: User releases key 60 (or time elapses). Clock reaches 1.2s.
    userPlayedKeys.delete(60);
    // CRITICAL: Previously, lack of satisfiedNoteIds caused the engine to freeze again here!
    state = checkWaitState(1.15, 1.20);
    expect(state.isWaiting).toBe(false);
    expect(state.nextTime).toBe(1.20); // Continues advancing smoothly!

    // Step 4: Clock reaches note 2 at 2.0s
    state = checkWaitState(1.98, 2.02);
    expect(state.isWaiting).toBe(true);
    expect(state.waitingPitch).toBe(64);
  });
});

describe('Octave Navigation & Clamping', () => {
  it('correctly maps octaves to MIDI target pitches and bounds', () => {
    const octToMidi = (oct: number) => 12 + Math.max(1, Math.min(7, oct)) * 12;
    expect(octToMidi(1)).toBe(24);  // C1
    expect(octToMidi(2)).toBe(36);  // C2
    expect(octToMidi(3)).toBe(48);  // C3
    expect(octToMidi(4)).toBe(60);  // C4 (Middle C)
    expect(octToMidi(5)).toBe(72);  // C5
    expect(octToMidi(6)).toBe(84);  // C6
    expect(octToMidi(7)).toBe(96);  // C7
    // Clamping test
    expect(octToMidi(0)).toBe(24);
    expect(octToMidi(9)).toBe(96);
  });
});

describe('Interactive Performance Scoring & Gamification (v1.3.0)', () => {
  it('accurately evaluates note strike timing precision tiers', () => {
    // PERFECT (within ±30ms)
    expect(evaluateStrikeTiming(0)).toBe('PERFECT');
    expect(evaluateStrikeTiming(28)).toBe('PERFECT');
    expect(evaluateStrikeTiming(-28)).toBe('PERFECT');
    expect(evaluateStrikeTiming(30)).toBe('PERFECT');
    expect(evaluateStrikeTiming(-30)).toBe('PERFECT');

    // GREAT (within ±70ms)
    expect(evaluateStrikeTiming(35)).toBe('GREAT');
    expect(evaluateStrikeTiming(-35)).toBe('GREAT');
    expect(evaluateStrikeTiming(70)).toBe('GREAT');
    expect(evaluateStrikeTiming(-70)).toBe('GREAT');

    // EARLY (between -71ms and -150ms)
    expect(evaluateStrikeTiming(-71)).toBe('EARLY');
    expect(evaluateStrikeTiming(-120)).toBe('EARLY');
    expect(evaluateStrikeTiming(-150)).toBe('EARLY');

    // LATE (between +71ms and +200ms)
    expect(evaluateStrikeTiming(71)).toBe('LATE');
    expect(evaluateStrikeTiming(140)).toBe('LATE');
    expect(evaluateStrikeTiming(200)).toBe('LATE');

    // MISS (outside acceptable strike envelopes)
    expect(evaluateStrikeTiming(250)).toBe('MISS');
    expect(evaluateStrikeTiming(-180)).toBe('MISS');
    expect(evaluateStrikeTiming(1000)).toBe('MISS');
  });

  it('applies cosmic combo streak multipliers at 10x, 25x, and 50x thresholds', () => {
    expect(getComboMultiplier(0)).toBe(1);
    expect(getComboMultiplier(9)).toBe(1);
    expect(getComboMultiplier(10)).toBe(2);
    expect(getComboMultiplier(24)).toBe(2);
    expect(getComboMultiplier(25)).toBe(4);
    expect(getComboMultiplier(49)).toBe(4);
    expect(getComboMultiplier(50)).toBe(8);
    expect(getComboMultiplier(120)).toBe(8);
  });

  it('accumulates score points, tracks streaks, and breaks combo on MISS', () => {
    const keeper = new ScoreKeeper();
    keeper.reset(10);

    // Hit 1: PERFECT (+100 * 1 = 100)
    let fb = keeper.registerHit(60, 5);
    expect(fb.rating).toBe('PERFECT');
    expect(fb.points).toBe(100);
    expect(fb.combo).toBe(1);
    expect(keeper.getState().score).toBe(100);

    // Hit 2: GREAT (+75 * 1 = 75 -> total 175)
    fb = keeper.registerHit(64, 45);
    expect(fb.rating).toBe('GREAT');
    expect(fb.points).toBe(75);
    expect(fb.combo).toBe(2);
    expect(keeper.getState().score).toBe(175);

    // Simulate streak up to 10
    for (let i = 3; i <= 9; i++) {
      keeper.registerHit(60, 10);
    }
    // 10th hit reaches 2x multiplier!
    fb = keeper.registerHit(67, 10);
    expect(fb.combo).toBe(10);
    expect(fb.multiplier).toBe(2);
    expect(fb.points).toBe(200); // 100 * 2x

    // MISS resets streak and multiplier back to 1x
    const missFb = keeper.registerMiss(72);
    expect(missFb.rating).toBe('MISS');
    expect(missFb.combo).toBe(0);
    expect(missFb.multiplier).toBe(1);
    expect(keeper.getState().streak).toBe(0);
    expect(keeper.getState().multiplier).toBe(1);
    expect(keeper.getState().missCount).toBe(1);
  });

  it('computes weighted accuracy and assigns Virtuoso star ratings', () => {
    // 100% accuracy = 5 stars Virtuoso
    expect(calculateStarRating(100).stars).toBe(5);
    expect(calculateStarRating(96).rank).toBe('Virtuoso');

    // 85-94% = 4 stars Maestro
    expect(calculateStarRating(90).stars).toBe(4);
    expect(calculateStarRating(85).rank).toBe('Maestro');

    // 70-84% = 3 stars Pianist
    expect(calculateStarRating(75).stars).toBe(3);
    expect(calculateStarRating(70).rank).toBe('Pianist');

    // 50-69% = 2 stars Apprentice
    expect(calculateStarRating(60).stars).toBe(2);
    expect(calculateStarRating(50).rank).toBe('Apprentice');

    // <50% = 1 star Novice
    expect(calculateStarRating(35).stars).toBe(1);
    expect(calculateStarRating(10).rank).toBe('Novice');
  });
});

describe('Live Performance Recorder & Standard MIDI Export (v1.3.0)', () => {
  it('correctly encodes Variable-Length Quantities (VLQ) for MIDI delta ticks', () => {
    expect(encodeVarInt(0)).toEqual([0x00]);
    expect(encodeVarInt(64)).toEqual([0x40]);
    expect(encodeVarInt(127)).toEqual([0x7f]);
    expect(encodeVarInt(128)).toEqual([0x81, 0x00]);
    expect(encodeVarInt(480)).toEqual([0x83, 0x60]); // 480 ticks/beat
    expect(encodeVarInt(16383)).toEqual([0xff, 0x7f]);
  });

  it('generates a valid Standard MIDI SMF Format 0 binary file with header and track chunks', () => {
    const sampleNotes = [
      { id: 'n1', pitch: 60, startTime: 0.0, duration: 0.5, hand: 'right' as const, velocity: 0.8 },
      { id: 'n2', pitch: 64, startTime: 0.5, duration: 0.5, hand: 'right' as const, velocity: 0.75 },
      { id: 'n3', pitch: 48, startTime: 0.0, duration: 1.0, hand: 'left' as const, velocity: 0.85 },
    ];

    const binary = generateMidiBinary(sampleNotes, 120, 'My Performance Take');
    expect(binary.byteLength).toBeGreaterThan(30);

    // MThd Header verification
    expect(String.fromCharCode(binary[0], binary[1], binary[2], binary[3])).toBe('MThd');
    const view = new DataView(binary.buffer);
    expect(view.getUint32(4)).toBe(6); // length 6
    expect(view.getUint16(8)).toBe(0); // Format 0
    expect(view.getUint16(10)).toBe(1); // 1 track
    expect(view.getUint16(12)).toBe(480); // 480 PPQ

    // MTrk Track verification
    expect(String.fromCharCode(binary[14], binary[15], binary[16], binary[17])).toBe('MTrk');
  });

  it('round-trips generated MIDI binary through parseMidiFile without data loss', () => {
    const originalNotes = [
      { id: 'r1', pitch: 60, startTime: 0.0, duration: 0.5, hand: 'right' as const, velocity: 0.8 },
      { id: 'r2', pitch: 67, startTime: 0.5, duration: 0.5, hand: 'right' as const, velocity: 0.9 },
      { id: 'r3', pitch: 45, startTime: 0.0, duration: 1.0, hand: 'left' as const, velocity: 0.7 },
    ];

    const binary = generateMidiBinary(originalNotes, 120, 'Studio Take 1');
    const parsed = parseMidiFile(binary.buffer as ArrayBuffer, 'Studio Take 1.mid');

    expect(parsed.title).toBe('Studio Take 1');
    expect(parsed.notes.length).toBe(3);

    // Verify all pitches preserved
    const pitches = parsed.notes.map((n) => n.pitch).sort();
    expect(pitches).toEqual([45, 60, 67]);

    // Verify hand separation
    const leftNote = parsed.notes.find((n) => n.pitch === 45);
    expect(leftNote?.hand).toBe('left');
    const rightNote = parsed.notes.find((n) => n.pitch === 60);
    expect(rightNote?.hand).toBe('right');
  });
});

describe('Concert Pitch Micro-Tuning Studio (v1.3.0)', () => {
  it('accurately tunes all 88 keys to A440, A432, A442, and A415 Baroque temperaments', () => {
    // 1. A440 Modern Standard
    pianoEngine.setConcertPitch(440);
    expect(pianoEngine.getConcertPitch()).toBe(440);
    expect(pianoEngine.midiToFrequency(69)).toBeCloseTo(440.0, 2);
    expect(pianoEngine.midiToFrequency(57)).toBeCloseTo(220.0, 2); // A3

    // 2. A432 Healing / Sacred Verdi Pitch
    pianoEngine.setConcertPitch(432);
    expect(pianoEngine.getConcertPitch()).toBe(432);
    expect(pianoEngine.midiToFrequency(69)).toBeCloseTo(432.0, 2);
    expect(pianoEngine.midiToFrequency(57)).toBeCloseTo(216.0, 2); // A3

    // 3. A442 European Orchestral Pitch
    pianoEngine.setConcertPitch(442);
    expect(pianoEngine.getConcertPitch()).toBe(442);
    expect(pianoEngine.midiToFrequency(69)).toBeCloseTo(442.0, 2);
    expect(pianoEngine.midiToFrequency(57)).toBeCloseTo(221.0, 2); // A3

    // 4. A415 Baroque Chamber Pitch (approx. 1 semitone flat)
    pianoEngine.setConcertPitch(415);
    expect(pianoEngine.getConcertPitch()).toBe(415);
    expect(pianoEngine.midiToFrequency(69)).toBeCloseTo(415.0, 2);
    expect(pianoEngine.midiToFrequency(57)).toBeCloseTo(207.5, 2); // A3

    // Restore standard A440
    pianoEngine.setConcertPitch(440);
    expect(pianoEngine.getConcertPitch()).toBe(440);
  });
});

describe('Expanded Repertoire & Categorization (v1.3.0)', () => {
  it('contains all 6 required pieces plus diverse musical categories', () => {
    const titles = SAMPLE_SONGS.map((s) => s.title);
    expect(titles.some((t) => t.includes('Für Elise'))).toBe(true);
    expect(titles.some((t) => t.includes('Nocturne'))).toBe(true);
    expect(titles.some((t) => t.includes('Clair de Lune'))).toBe(true);
    expect(titles.some((t) => t.includes('Canon in D'))).toBe(true);
    expect(titles.some((t) => t.includes('River Flows In You'))).toBe(true);
    expect(titles.some((t) => t.includes('Cornfield Chase') || t.includes('Interstellar'))).toBe(true);

    // Verify all 5 categories are represented
    const categories = new Set(SAMPLE_SONGS.map((s) => s.category));
    expect(categories.has('Classical')).toBe(true);
    expect(categories.has('Cinematic')).toBe(true);
    expect(categories.has('Neo-Soul')).toBe(true);
    expect(categories.has('Lo-Fi')).toBe(true);
    expect(categories.has('Anime')).toBe(true);
  });

  it('Für Elise has the authentic romantic opening motif and rolling left hand arpeggios', () => {
    const furElise = SAMPLE_SONGS.find((s) => s.id === 'fur-elise');
    expect(furElise).toBeDefined();
    expect(furElise?.notes.length).toBeGreaterThan(20);

    // Verify the opening E5 (76) - D#5 (75) motif
    const firstFiveNotes = furElise!.notes.slice(0, 5);
    expect(firstFiveNotes.map((n) => n.pitch)).toEqual([76, 75, 76, 75, 76]);
  });

  it('Canon in D features the immortal Baroque ground bass progression', () => {
    const canon = SAMPLE_SONGS.find((s) => s.id === 'canon-in-d');
    expect(canon).toBeDefined();
    expect(canon?.keySignature).toBe('D Major');

    // First bass notes in left hand
    const leftNotes = canon!.notes.filter((n) => n.hand === 'left');
    expect(leftNotes[0].pitch).toBe(50); // D3
  });

  it('River Flows In You features the signature A major arpeggiated movement', () => {
    const river = SAMPLE_SONGS.find((s) => s.id === 'river-flows-in-you');
    expect(river).toBeDefined();
    expect(river?.keySignature).toBe('A Major');
    expect(river?.category).toBe('Neo-Soul');
    expect(river?.notes.length).toBeGreaterThan(20);
  });
});

describe('Edge Cases & Boundary Safeguards (v1.3.0)', () => {
  it('safely handles empty note arrays when generating MIDI binary', () => {
    const binary = generateMidiBinary([], 120, 'Empty Song');
    expect(binary.byteLength).toBeGreaterThan(14);
    const parsed = parseMidiFile(binary.buffer as ArrayBuffer, 'Empty.mid');
    expect(parsed.notes.length).toBe(0);
  });

  it('clamps out-of-range MIDI parameters and speeds safely', () => {
    const weirdNotes = [
      { id: 'w1', pitch: 10, startTime: -2, duration: -0.5, hand: 'left' as const, velocity: 2.5 },
      { id: 'w2', pitch: 120, startTime: 1, duration: 0.1, hand: 'right' as const, velocity: -0.4 },
    ];
    const binary = generateMidiBinary(weirdNotes, 9999, 'Clamped Song');
    const parsed = parseMidiFile(binary.buffer as ArrayBuffer, 'Clamped.mid');
    expect(parsed.notes.length).toBe(2);
    expect(parsed.notes[0].pitch).toBeGreaterThanOrEqual(21);
    expect(parsed.notes[1].pitch).toBeLessThanOrEqual(108);
  });

  it('handles ScoreKeeper zero state without divide by zero', () => {
    const emptyScore = new ScoreKeeper().getState();
    expect(emptyScore.accuracy).toBe(0);
    expect(emptyScore.score).toBe(0);
    expect(emptyScore.streak).toBe(0);
    expect(calculateStarRating(emptyScore.accuracy).stars).toBe(0);
  });

  it('preserves and updates ScoreKeeper totalNotes across constructor, reset, and setTotalNotes', () => {
    const keeper = new ScoreKeeper(42);
    expect(keeper.getState().totalNotes).toBe(42);

    keeper.registerHit(60, 0);
    expect(keeper.getState().totalNotes).toBe(42);

    // Reset without args preserves totalNotes
    keeper.reset();
    expect(keeper.getState().totalNotes).toBe(42);
    expect(keeper.getState().score).toBe(0);

    // Reset with new totalNotes updates it
    keeper.reset(100);
    expect(keeper.getState().totalNotes).toBe(100);

    // setTotalNotes directly modifies totalNotes
    keeper.setTotalNotes(75);
    expect(keeper.getState().totalNotes).toBe(75);
  });

  it('correctly calculates metronome beats per measure and accented beats', async () => {
    const { metronomeEngine } = await import('../audio/MetronomeEngine');

    metronomeEngine.setTimeSignature('4/4');
    expect(metronomeEngine.getBeatsPerMeasure()).toBe(4);
    expect(metronomeEngine.isBeatAccented(0)).toBe(true);
    expect(metronomeEngine.isBeatAccented(1)).toBe(false);

    metronomeEngine.setTimeSignature('3/4');
    expect(metronomeEngine.getBeatsPerMeasure()).toBe(3);
    expect(metronomeEngine.isBeatAccented(0)).toBe(true);
    expect(metronomeEngine.isBeatAccented(2)).toBe(false);

    metronomeEngine.setTimeSignature('6/8');
    expect(metronomeEngine.getBeatsPerMeasure()).toBe(6);
    expect(metronomeEngine.isBeatAccented(0)).toBe(true);
    expect(metronomeEngine.isBeatAccented(1)).toBe(false);
    expect(metronomeEngine.isBeatAccented(3)).toBe(true); // Compound duple beat 2 accent
    expect(metronomeEngine.isBeatAccented(5)).toBe(false);
  });

  it('parses Uint8Array directly in parseMidiFile without needing ArrayBuffer casting', () => {
    const binary = generateMidiBinary([
      { id: '1', pitch: 60, startTime: 0, duration: 1, hand: 'right', velocity: 0.8 },
    ], 120, 'Uint8 Test');

    expect(binary instanceof Uint8Array).toBe(true);
    const parsed = parseMidiFile(binary, 'Uint8 Test.mid');
    expect(parsed.notes.length).toBe(1);
    expect(parsed.notes[0].pitch).toBe(60);
  });

  it('correctly models multi-touch polyphony pointer map behavior without note stealing', () => {
    // Model pointerMap behavior from PlayablePiano2D
    const pointerMap = new Map<number, number>();
    const activePitches = new Set<number>();

    const startPointer = (pointerId: number, midi: number) => {
      const prev = pointerMap.get(pointerId);
      if (prev !== undefined && prev !== midi) {
        const stillHeld = Array.from(pointerMap.entries()).some(
          ([id, p]) => id !== pointerId && p === prev
        );
        if (!stillHeld) activePitches.delete(prev);
      }
      pointerMap.set(pointerId, midi);
      activePitches.add(midi);
    };

    const endPointer = (pointerId: number) => {
      const pitch = pointerMap.get(pointerId);
      pointerMap.delete(pointerId);
      if (pitch !== undefined) {
        const stillHeld = Array.from(pointerMap.values()).includes(pitch);
        if (!stillHeld) activePitches.delete(pitch);
      }
    };

    // User plays C Major Triad (C4=60, E4=64, G4=67) with 3 fingers
    startPointer(1, 60);
    startPointer(2, 64);
    startPointer(3, 67);

    expect(activePitches.size).toBe(3);
    expect(activePitches.has(60)).toBe(true);
    expect(activePitches.has(64)).toBe(true);
    expect(activePitches.has(67)).toBe(true);

    // User lifts finger 2 (E4): C4 and G4 must remain held!
    endPointer(2);
    expect(activePitches.size).toBe(2);
    expect(activePitches.has(60)).toBe(true);
    expect(activePitches.has(64)).toBe(false);
    expect(activePitches.has(67)).toBe(true);

    // User lifts finger 1 (C4): G4 must still remain held!
    endPointer(1);
    expect(activePitches.size).toBe(1);
    expect(activePitches.has(67)).toBe(true);

    // Finally release finger 3 (G4)
    endPointer(3);
    expect(activePitches.size).toBe(0);
  });

  it('guarantees 0% accuracy and 0 stars on empty or 0-point performance score', () => {
    const zeroScore = {
      score: 0,
      streak: 0,
      maxStreak: 0,
      multiplier: 1,
      perfectCount: 0,
      greatCount: 0,
      earlyCount: 0,
      lateCount: 0,
      missCount: 0,
      totalNotes: 50,
      accuracy: 0,
    };
    expect(calculateAccuracy(zeroScore)).toBe(0);
    expect(calculateStarRating(0).stars).toBe(0);
    expect(calculateStarRating(0).rank).toBe('Novice');

    // Only misses: score is 0, total > 0 -> must return 0% accuracy and 0 stars
    const allMisses = {
      ...zeroScore,
      missCount: 5,
    };
    expect(calculateAccuracy(allMisses)).toBe(0);
    expect(calculateStarRating(calculateAccuracy(allMisses)).stars).toBe(0);
  });
});

describe('Touch Velocity Sensitivity (v2.2.0)', () => {
  it('maps key touch vertically from piano (0.45 at root) to forte (0.90 at front lip)', () => {
    // Top root of key (clientY = top -> ratio = 0)
    expect(calculateKeyTouchVelocity(100, 100, 200)).toBeCloseTo(0.45, 2);

    // Front lip of key (clientY = top + height -> ratio = 1)
    expect(calculateKeyTouchVelocity(300, 100, 200)).toBeCloseTo(0.90, 2);

    // Exact middle of key (clientY = top + 0.5 * height -> ratio = 0.5)
    expect(calculateKeyTouchVelocity(200, 100, 200)).toBeCloseTo(0.675, 3);
  });

  it('clamps touches that land outside key bounds safely', () => {
    // Touch above key (e.g. dragging in from ribbon)
    expect(calculateKeyTouchVelocity(50, 100, 200)).toBeCloseTo(0.45, 2);

    // Touch below key lip
    expect(calculateKeyTouchVelocity(400, 100, 200)).toBeCloseTo(0.90, 2);
  });

  it('falls back to standard 0.85 velocity on degenerate or zero key height', () => {
    expect(calculateKeyTouchVelocity(100, 100, 0)).toBe(0.85);
    expect(calculateKeyTouchVelocity(100, 100, -10)).toBe(0.85);
  });
});

describe('Pre-Roll Count-In Engine (v2.2.0)', () => {
  it('schedules cadence ticks and invokes completion for 4/4 1-bar count-in', () => {
    vi.useFakeTimers();
    const ticks: { beat: number; total: number; isAccented: boolean }[] = [];
    let completed = false;

    countInEngine.start({
      bpm: 120, // 500ms per beat
      beats: 4,
      playAudio: false,
      onTick: (beat, total, isAccented) => {
        ticks.push({ beat, total, isAccented });
      },
      onComplete: () => {
        completed = true;
      },
    });

    expect(countInEngine.isRunning()).toBe(true);
    expect(ticks.length).toBe(1);
    expect(ticks[0]).toEqual({ beat: 1, total: 4, isAccented: true });

    // Advance 500ms -> Beat 2
    vi.advanceTimersByTime(500);
    expect(ticks.length).toBe(2);
    expect(ticks[1]).toEqual({ beat: 2, total: 4, isAccented: false });

    // Advance 1000ms -> Beat 3 & 4
    vi.advanceTimersByTime(1000);
    expect(ticks.length).toBe(4);
    expect(ticks[2]).toEqual({ beat: 3, total: 4, isAccented: false });
    expect(ticks[3]).toEqual({ beat: 4, total: 4, isAccented: false });

    // Advance final 500ms -> Bar completes at 2000ms
    vi.advanceTimersByTime(500);
    expect(completed).toBe(true);
    expect(countInEngine.isRunning()).toBe(false);
    expect(countInEngine.getCurrentBeat()).toBe(0);

    vi.useRealTimers();
  });

  it('cancels pending count-in cleanly without triggering onComplete', () => {
    vi.useFakeTimers();
    let completed = false;
    let ticksCount = 0;

    countInEngine.start({
      bpm: 120,
      beats: 4,
      playAudio: false,
      onTick: () => {
        ticksCount++;
      },
      onComplete: () => {
        completed = true;
      },
    });

    expect(countInEngine.isRunning()).toBe(true);
    expect(ticksCount).toBe(1);

    // Cancel after beat 1
    countInEngine.cancel();
    expect(countInEngine.isRunning()).toBe(false);
    expect(countInEngine.getCurrentBeat()).toBe(0);

    // Fast-forward past full measure
    vi.advanceTimersByTime(3000);
    expect(ticksCount).toBe(1);
    expect(completed).toBe(false);

    vi.useRealTimers();
  });

  it('supports custom beat counts (e.g. 3/4 waltz count-in)', () => {
    vi.useFakeTimers();
    const beats: number[] = [];
    let completed = false;

    countInEngine.start({
      bpm: 180, // 333.3ms per beat
      beats: 3,
      playAudio: false,
      onTick: (beat) => beats.push(beat),
      onComplete: () => {
        completed = true;
      },
    });

    expect(countInEngine.getTotalBeats()).toBe(3);
    vi.advanceTimersByTime(1100);
    expect(beats).toEqual([1, 2, 3]);
    expect(completed).toBe(true);

    vi.useRealTimers();
  });
});

describe('Microphone Acoustic Overtone Suppression (v2.2.0)', () => {
  it('corrects 2nd harmonic overtone octave up to fundamental frequency', () => {
    const bufferSize = 1024;
    const c = new Float32Array(bufferSize).fill(0);

    // Candidate period detected at T0 = 100 (e.g. 441Hz 2nd harmonic overtone)
    const candidatePeriod = 100;
    c[candidatePeriod] = 1.0;

    // True fundamental is at 2 * T0 = 200 (220.5Hz) with strong correlation (80% of maxVal)
    c[200] = 0.82;

    const sampleRate = 44100;
    const correctedPeriod = micListener.suppressOvertones(c, candidatePeriod, 1.0, sampleRate);

    expect(correctedPeriod).toBe(200);
  });

  it('corrects 3rd harmonic overtone to lower register fundamental', () => {
    const bufferSize = 1024;
    const c = new Float32Array(bufferSize).fill(0);

    // Candidate period at T0 = 80
    const candidatePeriod = 80;
    c[candidatePeriod] = 1.0;

    // 2x period is weak
    c[160] = 0.4;
    // 3x period is strong (fundamental)
    c[240] = 0.78;

    const sampleRate = 44100;
    const correctedPeriod = micListener.suppressOvertones(c, candidatePeriod, 1.0, sampleRate);

    expect(correctedPeriod).toBe(240);
  });

  it('retains candidate period if subharmonics do not exceed threshold', () => {
    const bufferSize = 1024;
    const c = new Float32Array(bufferSize).fill(0);

    const candidatePeriod = 100;
    c[candidatePeriod] = 1.0;
    // Both 2x and 3x subharmonics are below 72%
    c[200] = 0.45;
    c[300] = 0.35;

    const sampleRate = 44100;
    const correctedPeriod = micListener.suppressOvertones(c, candidatePeriod, 1.0, sampleRate);

    expect(correctedPeriod).toBe(candidatePeriod);
  });

  it('guards against invalid periods or zero maximum correlation', () => {
    const c = new Float32Array(256).fill(0);
    expect(micListener.suppressOvertones(c, 0, 1.0, 44100)).toBe(0);
    expect(micListener.suppressOvertones(c, -10, 1.0, 44100)).toBe(-10);
    expect(micListener.suppressOvertones(c, 50, 0, 44100)).toBe(50);
  });
});

describe('Polyphonic Voice Stealing & Audio Engine Hardening (v2.2.0)', () => {
  // Set up mock Web Audio environment for node test runner
  class MockAudioNode {
    connect() {}
    disconnect() {}
  }

  class MockGainNode extends MockAudioNode {
    gain = {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      setTargetAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    };
  }

  class MockOscillatorNode extends MockAudioNode {
    frequency = {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    };
    start = vi.fn();
    stop = vi.fn();
  }

  class MockBiquadFilterNode extends MockAudioNode {
    frequency = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
    Q = { setValueAtTime: vi.fn() };
  }

  class MockAudioContext {
    currentTime = 10.0;
    state = 'running';
    destination = new MockAudioNode();
    createGain() {
      return new MockGainNode();
    }
    createOscillator() {
      return new MockOscillatorNode();
    }
    createBiquadFilter() {
      return new MockBiquadFilterNode();
    }
    createWaveShaper() {
      return { curve: null, oversample: '4x', connect: vi.fn() };
    }
    createDelay() {
      return { delayTime: { setValueAtTime: vi.fn() }, connect: vi.fn() };
    }
    createConvolver() {
      return { buffer: null, connect: vi.fn() };
    }
    createBuffer() {
      return { getChannelData: () => new Float32Array(100) };
    }
    createStereoPanner() {
      return { pan: { setValueAtTime: vi.fn() }, connect: vi.fn() };
    }
    resume = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
  }

  const originalWindow = globalThis.window;

  beforeAll(() => {
    (globalThis as unknown as { window: unknown }).window = {
      AudioContext: MockAudioContext,
      webkitAudioContext: MockAudioContext,
    };
  });

  afterAll(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });

  beforeEach(() => {
    // Reset all notes
    for (let p = 21; p <= 108; p++) {
      pianoEngine.stopNote(p);
    }
    pianoEngine.setSustainPedal(false);
  });

  it('exposes MAX_VOICES of 32', () => {
    expect(pianoEngine.getMaxVoices()).toBe(32);
  });

  it('caps active voice count at 32 and steals oldest voices when exceeded', () => {
    // Play 32 distinct notes (pitches 30 to 61)
    for (let pitch = 30; pitch < 30 + 32; pitch++) {
      pianoEngine.playNote(pitch, 0.8);
    }

    expect(pianoEngine.getActiveVoiceCount()).toBe(32);

    // Play 33rd note: voice stealing must trigger and active voice count must remain <= 32
    pianoEngine.playNote(70, 0.8);
    expect(pianoEngine.getActiveVoiceCount()).toBe(32);
    // Oldest voice (30) was stolen, newest voice (70) is active
    expect(pianoEngine.getActivePitches().includes(70)).toBe(true);
    expect(pianoEngine.getActivePitches().includes(30)).toBe(false);
  });

  it('prioritizes stealing sustained notes over actively held notes', () => {
    // Play note 40 and note 50
    pianoEngine.playNote(40, 0.8);
    pianoEngine.playNote(50, 0.8);

    // Press sustain pedal
    pianoEngine.setSustainPedal(true);

    // Release note 40 (key released, but sustained by pedal)
    pianoEngine.stopNote(40);

    // Note 50 is still physically held (isSustained = false)
    // Now fill remaining 30 voices (total 32 voices)
    for (let p = 60; p < 90; p++) {
      pianoEngine.playNote(p, 0.8);
    }
    expect(pianoEngine.getActiveVoiceCount()).toBe(32);

    // Note 40 is sustained, note 50 is actively held
    // When playing a 33rd note, voice stealing should steal sustained note 40 first!
    pianoEngine.playNote(100, 0.8);

    expect(pianoEngine.getActiveVoiceCount()).toBe(32);
    expect(pianoEngine.getActivePitches().includes(40)).toBe(false); // Sustained was stolen
    expect(pianoEngine.getActivePitches().includes(50)).toBe(true);  // Actively held was preserved!
  });

  it('releases all sustained voices when sustain pedal is released', () => {
    pianoEngine.setSustainPedal(true);
    pianoEngine.playNote(60, 0.8);
    pianoEngine.playNote(64, 0.8);
    pianoEngine.stopNote(60);
    pianoEngine.stopNote(64);

    expect(pianoEngine.getActiveVoiceCount()).toBe(2);

    // Release sustain pedal -> both sustained notes should be removed
    pianoEngine.setSustainPedal(false);
    expect(pianoEngine.getActiveVoiceCount()).toBe(0);
  });
});


