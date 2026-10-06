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
    category: 'Cinematic',
    description: 'Iconic cinematic arpeggios with driving bass octaves and soaring cosmic high notes.',
    notes: generateCornfieldChase(),
  },
  {
    id: 'fur-elise',
    title: 'Für Elise (Bagatelle No. 25)',
    composer: 'Ludwig van Beethoven',
    bpm: 130,
    duration: 32,
    keySignature: 'A minor',
    difficulty: 'Intermediate',
    category: 'Classical',
    description: 'Immortal romantic melody alternating between E5 and D#5 over rolling left-hand arpeggios in A minor and E major.',
    notes: generateFurElise(),
  },
  {
    id: 'chopin-nocturne',
    title: 'Nocturne Op. 9 No. 2',
    composer: 'Frédéric Chopin',
    bpm: 84,
    duration: 36,
    keySignature: 'E♭ Major',
    difficulty: 'Virtuoso',
    category: 'Classical',
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
    category: 'Classical',
    description: 'Impressionist masterpiece with ethereal harmonic layers, floating chords, and delicate celestial sparkles.',
    notes: generateClairDeLune(),
  },
  {
    id: 'canon-in-d',
    title: 'Canon in D Major',
    composer: 'Johann Pachelbel',
    bpm: 68,
    duration: 34,
    keySignature: 'D Major',
    difficulty: 'Beginner',
    category: 'Classical',
    description: 'Baroque ground bass progression under an elegant polyphonic canon melody with stepwise harmonic motion.',
    notes: generateCanonInD(),
  },
  {
    id: 'river-flows-in-you',
    title: 'River Flows In You',
    composer: 'Yiruma',
    bpm: 74,
    duration: 34,
    keySignature: 'A Major',
    difficulty: 'Intermediate',
    category: 'Neo-Soul',
    description: 'Modern lyrical piano anthem with emotional rolling arpeggios (F#m - D - A - E) and soaring pop-piano phrases.',
    notes: generateRiverFlowsInYou(),
  },
  {
    id: 'merry-go-round',
    title: 'Merry-Go-Round of Life',
    composer: 'Joe Hisaishi (Howl’s Moving Castle)',
    bpm: 124,
    duration: 30,
    keySignature: 'G minor',
    difficulty: 'Intermediate',
    category: 'Anime',
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
    category: 'Classical',
    description: 'Serene, hypnotic minimalism with alternating bass fundamentals, major 7th chords, and suspended melodies.',
    notes: generateGymnopedie(),
  },
  {
    id: 'midnight-lofi',
    title: 'Midnight Cassette Groove',
    composer: 'Pianotes Sound Lab',
    bpm: 78,
    duration: 32,
    keySignature: 'C Minor',
    difficulty: 'Beginner',
    category: 'Lo-Fi',
    description: 'Nostalgic tape-saturated chillhop study with lush ninth chords, mellow electric tine voicings, and warm vinyl atmosphere.',
    notes: generateMidnightLoFi(),
  },
];

function generateCornfieldChase(): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let id = 1;
  const beat = 60 / 112; // ~0.535s
  const sixteenth = beat / 4;

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

function generateFurElise(): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let id = 1;
  const beat = 60 / 130; // ~0.46s (3/8 time)
  const sixteenth = beat / 2;

  // Motif: E5, D#5, E5, D#5, E5, B4, D5, C5, A4
  const motif = [
    { pitch: 76, dur: 1 }, // E5
    { pitch: 75, dur: 1 }, // D#5
    { pitch: 76, dur: 1 }, // E5
    { pitch: 75, dur: 1 }, // D#5
    { pitch: 76, dur: 1 }, // E5
    { pitch: 71, dur: 1 }, // B4
    { pitch: 74, dur: 1 }, // D5
    { pitch: 72, dur: 1 }, // C5
    { pitch: 69, dur: 2 }, // A4
  ];

  // Continuation 1: C3-E3-A3 in LH -> C4-E4-A4-B4 in RH
  // Continuation 2: E3-G#3-B3 in LH -> E4-G#4-B4-C5 in RH
  let time = 0.5;

  for (let repetition = 0; repetition < 3; repetition++) {
    // Opening Motif in Right Hand
    motif.forEach((n) => {
      notes.push({
        id: `fe-rh-${id++}`,
        pitch: n.pitch,
        startTime: time,
        duration: n.dur * sixteenth * 0.9,
        hand: 'right',
        velocity: 0.88,
      });
      time += n.dur * sixteenth;
    });

    // LH Arpeggio 1 (Am): A2 -> E3 -> A3
    const lhAm = [45, 52, 57];
    lhAm.forEach((p, idx) => {
      notes.push({
        id: `fe-lh-${id++}`,
        pitch: p,
        startTime: time + idx * sixteenth,
        duration: sixteenth * 2.2,
        hand: 'left',
        velocity: 0.78,
      });
    });

    // RH pickup to B: C4 -> E4 -> A4 -> B4
    const rhAm = [60, 64, 69, 71];
    rhAm.forEach((p, idx) => {
      notes.push({
        id: `fe-rh-${id++}`,
        pitch: p,
        startTime: time + idx * sixteenth,
        duration: sixteenth * 1.0,
        hand: 'right',
        velocity: 0.82,
      });
    });
    time += sixteenth * 4;

    // LH Arpeggio 2 (E maj): E2 -> E3 -> G#3
    const lhE = [40, 52, 56];
    lhE.forEach((p, idx) => {
      notes.push({
        id: `fe-lh-${id++}`,
        pitch: p,
        startTime: time + idx * sixteenth,
        duration: sixteenth * 2.2,
        hand: 'left',
        velocity: 0.78,
      });
    });

    // RH pickup to C: E4 -> G#4 -> B4 -> C5
    const rhE = [64, 68, 71, 72];
    rhE.forEach((p, idx) => {
      notes.push({
        id: `fe-rh-${id++}`,
        pitch: p,
        startTime: time + idx * sixteenth,
        duration: sixteenth * 1.0,
        hand: 'right',
        velocity: 0.84,
      });
    });
    time += sixteenth * 4;
  }

  return notes;
}

function generateChopinNocturne(): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let id = 1;
  const beat = 60 / 84; // ~0.714s

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

  const phrases = [
    { lh: [49, 56], rh: [[77, 80], [75, 77], [73, 75], [72, 73]] },
    { lh: [46, 53], rh: [[70, 73], [68, 70], [66, 68], [65, 66]] },
    { lh: [42, 49], rh: [[65, 68], [63, 65], [61, 63], [60, 61]] },
    { lh: [44, 51], rh: [[68, 72], [70, 73], [72, 75], [73, 77]] },
  ];

  let time = 0.5;
  for (const ph of phrases) {
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

function generateCanonInD(): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let id = 1;
  const beat = 60 / 68; // ~0.88s

  // Ground bass in D Major: D -> A -> Bm -> F#m -> G -> D -> G -> A
  const progression = [
    { bass: 50, chord: [62, 66, 69], melody: 78 }, // D: D4-F#4-A4, F#5
    { bass: 45, chord: [57, 61, 64], melody: 76 }, // A: A3-C#4-E4, E5
    { bass: 47, chord: [59, 62, 66], melody: 74 }, // Bm: B3-D4-F#4, D5
    { bass: 42, chord: [54, 57, 61], melody: 73 }, // F#m: F#3-A3-C#4, C#5
    { bass: 43, chord: [55, 59, 62], melody: 71 }, // G: G3-B3-D4, B4
    { bass: 38, chord: [50, 54, 57], melody: 69 }, // D: D3-F#3-A3, A4
    { bass: 43, chord: [55, 59, 62], melody: 71 }, // G: G3-B3-D4, B4
    { bass: 45, chord: [57, 61, 64], melody: 73 }, // A: A3-C#4-E4, C#5
  ];

  let time = 0.5;
  for (let round = 0; round < 2; round++) {
    for (const step of progression) {
      // LH Bass Note (Violet)
      notes.push({
        id: `cid-lh-b-${id++}`,
        pitch: step.bass,
        startTime: time,
        duration: beat * 1.8,
        hand: 'left',
        velocity: 0.88,
      });

      // LH Arpeggiated Inner Harmony
      step.chord.forEach((p, idx) => {
        notes.push({
          id: `cid-lh-c-${id++}`,
          pitch: p,
          startTime: time + (idx + 1) * (beat * 0.45),
          duration: beat * 0.8,
          hand: 'left',
          velocity: 0.68,
        });
      });

      // RH Soaring Canon Melody (Amber)
      notes.push({
        id: `cid-rh-m-${id++}`,
        pitch: step.melody,
        startTime: time,
        duration: beat * 1.5,
        hand: 'right',
        velocity: 0.9,
      });

      // RH Grace step
      notes.push({
        id: `cid-rh-s-${id++}`,
        pitch: step.melody - 2,
        startTime: time + beat * 1.1,
        duration: beat * 0.7,
        hand: 'right',
        velocity: 0.75,
      });

      time += beat * 2;
    }
  }

  return notes;
}

function generateRiverFlowsInYou(): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let id = 1;
  const beat = 60 / 74; // ~0.81s
  const sixteenth = beat / 4;

  // Progression: F#m -> D -> A -> E
  const chords = [
    { bass: 42, arp: [54, 57, 61, 66] }, // F#m: F#2, F#3, A3, C#4, F#4
    { bass: 38, arp: [50, 54, 57, 62] }, // D: D2, D3, F#3, A3, D4
    { bass: 45, arp: [57, 61, 64, 69] }, // A: A2, A3, C#4, E4, A4
    { bass: 40, arp: [52, 56, 59, 64] }, // E: E2, E3, G#3, B3, E4
  ];

  // Signature melody riff: G#4, A4, G#4, A4, B4, A4...
  const rhRiffs = [
    [68, 69, 68, 69, 71, 69, 73, 71], // G#4 -> A4 -> G#4 -> A4 -> B4 -> A4 -> C#5 -> B4
    [69, 71, 73, 74, 73, 71, 69, 68], // A4 -> B4 -> C#5 -> D5 -> C#5 -> B4 -> A4 -> G#4
    [68, 69, 68, 69, 71, 69, 73, 71],
    [71, 69, 68, 66, 68, 69, 71, 69],
  ];

  let time = 0.5;
  for (let cycle = 0; cycle < 2; cycle++) {
    chords.forEach((ch, cIdx) => {
      // LH Bass
      notes.push({
        id: `rfy-lh-b-${id++}`,
        pitch: ch.bass,
        startTime: time,
        duration: beat * 3.8,
        hand: 'left',
        velocity: 0.9,
      });

      // LH Gentle 8th note rolling arpeggio
      ch.arp.forEach((p, idx) => {
        notes.push({
          id: `rfy-lh-a-${id++}`,
          pitch: p,
          startTime: time + idx * (beat * 0.8),
          duration: beat * 1.2,
          hand: 'left',
          velocity: 0.72,
        });
      });

      // RH Melody notes
      const riff = rhRiffs[cIdx % rhRiffs.length];
      riff.forEach((p, idx) => {
        notes.push({
          id: `rfy-rh-${id++}`,
          pitch: p,
          startTime: time + idx * (sixteenth * 2),
          duration: sixteenth * 2.2,
          hand: 'right',
          velocity: 0.88,
        });
      });

      time += beat * 4;
    });
  }

  return notes;
}

function generateMerryGoRound(): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let id = 1;
  const beat = 60 / 124; // ~0.48s

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
    { bass: 38, chord: [57, 61, 64, 68] }, // D2 -> F#3, C#4, E4, G#4
    { bass: 43, chord: [57, 62, 66] },     // G2 -> A3, D4, F#4
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
    notes.push({
      id: `gym-lh-b-${id++}`,
      pitch: ch.bass,
      startTime: time,
      duration: beat * 0.9,
      hand: 'left',
      velocity: 0.82,
    });
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

function generateMidnightLoFi(): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let id = 1;
  const beat = 60 / 78; // ~0.769s

  // Jazzy Lo-Fi chords in C minor: Cm9 -> Abmaj9 -> Fm9 -> G7(#9)
  const lofiChords = [
    { bass: 36, chords: [48, 55, 58, 62, 63] }, // Cm9: C2, C3, G3, Bb3, D4, Eb4
    { bass: 44, chords: [51, 55, 58, 60, 67] }, // Abmaj9: Ab2, Eb3, G3, Bb3, C4, G4
    { bass: 41, chords: [48, 53, 56, 60, 63] }, // Fm9: F2, C3, F3, Ab3, C4, Eb4
    { bass: 43, chords: [47, 53, 58, 62, 66] }, // G7(#9): G2, B2, F3, Bb3, D4, F#4
  ];

  const rhSolos = [
    [70, 72, 75, 74, 72], // Bb4 -> C5 -> Eb5 -> D5 -> C5
    [67, 70, 72, 70, 67], // G4 -> Bb4 -> C5 -> Bb4 -> G4
    [65, 68, 70, 72, 70], // F4 -> Ab4 -> Bb4 -> C5 -> Bb4
    [67, 71, 74, 75, 74], // G4 -> B4 -> D5 -> Eb5 -> D5
  ];

  let time = 0.5;
  for (let pass = 0; pass < 2; pass++) {
    lofiChords.forEach((ch, idx) => {
      // Warm Sub Bass
      notes.push({
        id: `mlo-lh-b-${id++}`,
        pitch: ch.bass,
        startTime: time,
        duration: beat * 3.6,
        hand: 'left',
        velocity: 0.88,
      });

      // Electric Piano Pad Harmony
      ch.chords.forEach((p) => {
        notes.push({
          id: `mlo-lh-c-${id++}`,
          pitch: p,
          startTime: time + beat * 0.25,
          duration: beat * 3.2,
          hand: 'left',
          velocity: 0.65,
        });
      });

      // Mellow Solo Toplines
      const solo = rhSolos[idx];
      solo.forEach((p, sIdx) => {
        notes.push({
          id: `mlo-rh-${id++}`,
          pitch: p,
          startTime: time + beat * (0.6 + sIdx * 0.6),
          duration: beat * 0.85,
          hand: 'right',
          velocity: 0.82,
        });
      });

      time += beat * 4;
    });
  }

  return notes;
}
