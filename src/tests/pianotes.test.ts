import { describe, it, expect } from 'vitest';
import { detectChord, midiToNoteName, isBlackKey } from '../utils/chordDetector';
import { SAMPLE_SONGS } from '../data/songs';
import { pianoEngine } from '../audio/PianoEngine';

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

