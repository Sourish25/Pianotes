import { describe, it, expect } from 'vitest';
import { detectChord, midiToNoteName, isBlackKey } from '../utils/chordDetector';
import { SAMPLE_SONGS } from '../data/songs';

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
