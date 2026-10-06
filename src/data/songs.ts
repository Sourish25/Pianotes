import type { SongData, NoteEvent } from '../types';

export const SAMPLE_SONGS: SongData[] = [
  {
    id: 'cornfield-chase',
    title: 'Cornfield Chase (Interstellar)',
    composer: 'Hans Zimmer',
    bpm: 112,
    duration: 32,
    keySignature: 'A minor',
    difficulty: 'Intermediate',
    description: 'Iconic cinematic arpeggios with driving bass octaves and soaring cosmic high notes.',
    notes: generateCornfieldChase(),
  },
  {
    id: 'chopin-nocturne',
    title: 'Nocturne Op. 9 No. 2',
    composer: 'Frédéric Chopin',
    bpm: 84,
    duration: 36,
    keySignature: 'E♭ Major',
    difficulty: 'Virtuoso',
    description: 'Legendary romantic waltz: violet left hand gentle rocking accompaniment and golden singing right hand rubato.',
    notes: generateChopinNocturne(),
  },
  {
    id: 'clair-de-lune',
    title: 'Clair de Lune',
    composer: 'Claude Debussy',
    bpm: 66,
    duration: 34,
    keySignature: 'D♭ Major',
    difficulty: 'Intermediate',
    description: 'Impressionist masterpiece with ethereal harmonic layers, floating chords, and delicate celestial sparkles.',
    notes: generateClairDeLune(),
  },
  {
    id: 'merry-go-round',
    title: 'Merry-Go-Round of Life',
    composer: 'Joe Hisaishi (Howl’s Moving Castle)',
    bpm: 124,
    duration: 30,
    keySignature: 'G minor',
    difficulty: 'Intermediate',
    description: 'Whimsical Studio Ghibli waltz featuring punchy bass-chord left hand and an enchanting right hand melody.',
    notes: generateMerryGoRound(),
  },
  {
    id: 'gymnopedie',
    title: 'Gymnopédie No. 1',
    composer: 'Erik Satie',
    bpm: 60,
    duration: 35,
    keySignature: 'D Major',
    difficulty: 'Beginner',
    description: 'Serene, hypnotic minimalism with alternating bass fundamentals, major 7th chords, and suspended melodies.',
    notes: generateGymnopedie(),
  },
];

function generateCornfieldChase(): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let id = 1;
  const beat = 60 / 112; // ~0.535s
  const sixteenth = beat / 4;

  // Pattern repeats across chords: Am -> F -> C -> G
  const chordRoots = [
    { bass: 45, rhArp: [69, 72, 76, 81, 76, 72] }, // Am (A2)
    { bass: 41, rhArp: [65, 69, 72, 77, 72, 69] }, // F (F2)
    { bass: 36, rhArp: [60, 64, 67, 72, 67, 64] }, // C (C2)
    { bass: 43, rhArp: [67, 71, 74, 79, 74, 71] }, // G (G2)
  ];

  let time = 0.5;
  for (let cycle = 0; cycle < 3; cycle++) {
    for (const ch of chordRoots) {
      // Left Hand: Driving bass octaves (Violet)
      notes.push({
        id: `c-lh-${id++}`,
        pitch: ch.bass,
        startTime: time,
        duration: beat * 2.8,
        hand: 'left',
        velocity: 0.9,
      });
      notes.push({
        id: `c-lh-${id++}`,
        pitch: ch.bass + 12,
        startTime: time,
        duration: beat * 2.8,
        hand: 'left',
        velocity: 0.85,
      });

      // Right Hand: Continuous shimmering arpeggios (Amber/Gold)
      for (let i = 0; i < 12; i++) {
        const pitch = ch.rhArp[i % ch.rhArp.length];
        notes.push({
          id: `c-rh-${id++}`,
          pitch: pitch + (i >= 6 ? 12 : 0),
          startTime: time + i * sixteenth,
          duration: sixteenth * 1.5,
          hand: 'right',
          velocity: 0.7 + (i % 3 === 0 ? 0.2 : 0.05),
        });
      }
      time += beat * 3;
    }
  }

  return notes;
}

function generateChopinNocturne(): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let id = 1;
  const beat = 60 / 84; // ~0.714s

  // Chopin Op 9 No 2 opening in Eb Major
  // LH: Eb bass -> (G Bb Eb) -> (G Bb Eb)
  const lhPatterns = [
    { bass: 39, chord: [51, 55, 58] }, // Eb2, Eb3-G3-Bb3
    { bass: 44, chord: [51, 56, 60] }, // Ab2, Eb3-Ab3-C4
    { bass: 41, chord: [50, 53, 57] }, // F2, D3-F3-A3
    { bass: 46, chord: [53, 56, 62] }, // Bb2, F3-Ab3-D4
  ];

  const rhMelody = [
    { pitch: 71, dur: 1.5 }, // B
    { pitch: 70, dur: 0.5 }, // Bb
    { pitch: 68, dur: 0.5 }, // Ab
    { pitch: 70, dur: 1.0 }, // Bb
    { pitch: 75, dur: 2.0 }, // Eb5
    { pitch: 74, dur: 0.5 }, // D5
    { pitch: 72, dur: 0.5 }, // C5
    { pitch: 70, dur: 1.5 }, // Bb4
    { pitch: 68, dur: 0.75 }, // Ab4
    { pitch: 67, dur: 1.25 }, // G4
  ];

  let time = 0.5;
  let rhIndex = 0;
  let rhTime = 0.5;

  for (let m = 0; m < 6; m++) {
    const pat = lhPatterns[m % lhPatterns.length];
    // LH Bass
    notes.push({
      id: `ch-lh-b-${id++}`,
      pitch: pat.bass,
      startTime: time,
      duration: beat * 0.9,
      hand: 'left',
      velocity: 0.85,
    });
    // LH Chords (beat 2 and 3)
    [beat * 1, beat * 2].forEach((offset) => {
      pat.chord.forEach((p) => {
        notes.push({
          id: `ch-lh-c-${id++}`,
          pitch: p,
          startTime: time + offset,
          duration: beat * 0.8,
          hand: 'left',
          velocity: 0.65,
        });
      });
    });

    time += beat * 3;
  }

  // Right Hand expressive melody
  while (rhTime < time && rhIndex < rhMelody.length) {
    const mel = rhMelody[rhIndex % rhMelody.length];
    notes.push({
      id: `ch-rh-${id++}`,
      pitch: mel.pitch,
      startTime: rhTime,
      duration: mel.dur * beat,
      hand: 'right',
      velocity: 0.88,
    });
    rhTime += mel.dur * beat;
    rhIndex++;
  }

  return notes;
}

function generateClairDeLune(): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let id = 1;
  const beat = 60 / 66; // ~0.9s

  // Db Major opening: F5 & Ab5 descending into Db dyad
  const phrases = [
    { lh: [49, 56], rh: [[77, 80], [75, 77], [73, 75], [72, 73]] },
    { lh: [46, 53], rh: [[70, 73], [68, 70], [66, 68], [65, 66]] },
    { lh: [42, 49], rh: [[65, 68], [63, 65], [61, 63], [60, 61]] },
    { lh: [44, 51], rh: [[68, 72], [70, 73], [72, 75], [73, 77]] },
  ];

  let time = 0.5;
  for (const ph of phrases) {
    // LH sustained low fifth
    ph.lh.forEach((p) => {
      notes.push({
        id: `cdl-lh-${id++}`,
        pitch: p,
        startTime: time,
        duration: beat * 3.5,
        hand: 'left',
        velocity: 0.72,
      });
    });

    // RH gentle floating dyads
    ph.rh.forEach((pair, idx) => {
      pair.forEach((p) => {
        notes.push({
          id: `cdl-rh-${id++}`,
          pitch: p,
          startTime: time + idx * (beat * 0.9),
          duration: beat * 1.2,
          hand: 'right',
          velocity: 0.78,
        });
      });
    });

    time += beat * 4;
  }

  return notes;
}

function generateMerryGoRound(): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let id = 1;
  const beat = 60 / 124; // ~0.48s

  // Gm waltz: G2 -> [Bb3, D4, G4] -> [Bb3, D4, G4]
  const waltzChords = [
    { bass: 43, chord: [58, 62, 67] }, // Gm
    { bass: 46, chord: [58, 62, 65] }, // Bb
    { bass: 38, chord: [57, 62, 65] }, // Dm
    { bass: 45, chord: [57, 60, 64] }, // A
  ];

  const rhPhrases = [
    [67, 70, 74, 72, 70, 69], // G4, Bb4, D5, C5, Bb4, A4
    [69, 72, 75, 74, 72, 70], // A4, C5, Eb5, D5, C5, Bb4
    [70, 74, 77, 75, 74, 72], // Bb4, D5, F5, Eb5, D5, C5
    [69, 70, 72, 74, 72, 69], // A4, Bb4, C5, D5, C5, A4
  ];

  let time = 0.5;
  for (let i = 0; i < 4; i++) {
    const ch = waltzChords[i];
    const phrase = rhPhrases[i];

    // LH Bass beat 1
    notes.push({
      id: `mgr-lh-b-${id++}`,
      pitch: ch.bass,
      startTime: time,
      duration: beat * 0.8,
      hand: 'left',
      velocity: 0.92,
    });
    // LH Chord beats 2 and 3
    [beat, beat * 2].forEach((offset) => {
      ch.chord.forEach((p) => {
        notes.push({
          id: `mgr-lh-c-${id++}`,
          pitch: p,
          startTime: time + offset,
          duration: beat * 0.7,
          hand: 'left',
          velocity: 0.75,
        });
      });
    });

    // RH Melody
    phrase.forEach((p, idx) => {
      notes.push({
        id: `mgr-rh-${id++}`,
        pitch: p,
        startTime: time + idx * (beat * 0.5),
        duration: beat * 0.6,
        hand: 'right',
        velocity: 0.85,
      });
    });

    time += beat * 3;
  }

  return notes;
}

function generateGymnopedie(): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let id = 1;
  const beat = 60 / 60; // 1.0s

  const chords = [
    { bass: 38, chord: [57, 61, 64, 68] }, // D2 -> F#3, C#4, E4, G#4 (Gmaj7 / D)
    { bass: 43, chord: [57, 62, 66] },     // G2 -> A3, D4, F#4 (Dmaj7 / G)
    { bass: 38, chord: [57, 61, 64, 68] },
    { bass: 43, chord: [57, 62, 66] },
  ];

  const rhMelody = [
    { pitch: 69, dur: 2.5, start: 1.0 }, // A4
    { pitch: 71, dur: 1.5, start: 3.5 }, // B4
    { pitch: 73, dur: 2.0, start: 5.0 }, // C#5
    { pitch: 69, dur: 2.0, start: 7.0 }, // A4
  ];

  let time = 0.5;
  for (const ch of chords) {
    // LH Bass on beat 1
    notes.push({
      id: `gym-lh-b-${id++}`,
      pitch: ch.bass,
      startTime: time,
      duration: beat * 0.9,
      hand: 'left',
      velocity: 0.82,
    });
    // LH Chord on beat 2
    ch.chord.forEach((p) => {
      notes.push({
        id: `gym-lh-c-${id++}`,
        pitch: p,
        startTime: time + beat * 1.0,
        duration: beat * 1.8,
        hand: 'left',
        velocity: 0.68,
      });
    });
    time += beat * 3;
  }

  rhMelody.forEach((mel) => {
    notes.push({
      id: `gym-rh-${id++}`,
      pitch: mel.pitch,
      startTime: 0.5 + mel.start,
      duration: mel.dur * beat,
      hand: 'right',
      velocity: 0.86,
    });
  });

  return notes;
}
