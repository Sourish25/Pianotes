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
