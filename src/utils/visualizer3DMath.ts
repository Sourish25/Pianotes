/**
 * visualizer3DMath.ts
 * Pure mathematical, audio-visual bloom mapping, and geometric positioning utilities
 * for the Pianotes 3D Waterfall Engine.
 */

export const NOTE_FALL_SPEED = 14; // units per second
export const STRIKE_Z = 0; // Strike line Z position
export const VISIBLE_WINDOW = 5.5; // Look ahead in seconds (extended majestic concert vista)
export const KEY_MIN_MIDI = 21; // A0
export const KEY_MAX_MIDI = 108; // C8
export const KEY_WIDTH_WHITE = 0.58;
export const KEY_WIDTH_BLACK = 0.42;
export const KEY_LENGTH_WHITE = 6.8;
export const KEY_LENGTH_BLACK = 4.2;

/**
 * Calculates horizontal X coordinate on the 88-key bed for any MIDI pitch.
 * Centered around Middle C / D4 area (MIDI 64.5).
 */
export function getNoteX(pitch: number): number {
  return (pitch - 64.5) * 0.62;
}

/**
 * Determines if a MIDI pitch is a black key (sharp/flat).
 */
export function isBlackKey(pitch: number): boolean {
  return [1, 3, 6, 8, 10].includes(pitch % 12);
}

/**
 * Calculates velocity-sensitive bloom intensity and crystalline translucency for 3D notes.
 * - Pianissimo notes (vel ~ 0.2 - 0.4): Deep translucent crystal body (lower resting emissive, higher transparency).
 * - Forte notes (vel ~ 0.8 - 1.0): Radiant luminescence (bright resting emissive core, high opacity).
 * - Striking notes: Striking bloom multiplies by velocity, reaching blinding white-hot luminescence (up to 2.6).
 */
export interface NoteBloomMetrics {
  emissiveIntensity: number;
  opacity: number;
  roughness: number;
  strikeCapIntensity: number;
}

export function calculateNoteBloom(velocity: number = 0.75, isStriking: boolean = false): NoteBloomMetrics {
  const safeVel = Number.isFinite(velocity) ? Math.max(0.15, Math.min(1.0, velocity)) : 0.75;

  if (isStriking) {
    return {
      // Radiant strike bloom: 1.30 up to 2.60
      emissiveIntensity: 1.30 + safeVel * 1.30,
      opacity: 0.98,
      roughness: 0.08,
      strikeCapIntensity: 1.0 + safeVel * 0.8,
    };
  }

  // Resting / falling crystal state:
  return {
    // Resting bloom: 0.35 up to 0.85
    emissiveIntensity: 0.35 + safeVel * 0.50,
    // Crystalline translucency: pianissimo has deeper translucency (0.76), forte has dense crystal (0.96)
    opacity: 0.76 + safeVel * 0.20,
    roughness: 0.18 - safeVel * 0.08,
    strikeCapIntensity: 0.6 + safeVel * 0.35,
  };
}

/**
 * Evaluates whether a falling note should emit a trailing edge ember wake.
 * Forte notes (velocity >= 0.72) have glowing trails.
 */
export function shouldEmitTrailingEmbers(velocity: number = 0.75, randomSeed: number = 0): boolean {
  const safeVel = Number.isFinite(velocity) ? velocity : 0.75;
  const safeSeed = Number.isFinite(randomSeed) ? Math.max(0, Math.min(1.0, randomSeed)) : 0;
  return safeVel >= 0.72 && safeSeed < 0.22;
}

/**
 * Octave markers data for C1 through C7.
 */
export interface OctaveMarkerData {
  pitch: number;
  octave: number;
  label: string;
  roman: string;
  posX: number;
  keyX: number;
  isMiddleC: boolean;
}

export const OCTAVE_PITCHES = [24, 36, 48, 60, 72, 84, 96] as const;
export const ROMAN_NUMERALS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
};

export function getOctaveMarkerData(pitch: number): OctaveMarkerData | null {
  if (!Number.isFinite(pitch)) return null;
  const safePitch = Math.round(pitch);
  if (!(OCTAVE_PITCHES as readonly number[]).includes(safePitch)) return null;
  const octave = Math.floor(safePitch / 12) - 1;
  const keyX = getNoteX(safePitch);
  return {
    pitch: safePitch,
    octave,
    label: `C${octave}`,
    roman: ROMAN_NUMERALS[octave] || `${octave}`,
    posX: keyX - 0.31,
    keyX,
    isMiddleC: safePitch === 60,
  };
}

/**
 * Audio-reactive keybed underglow calculation:
 * Computes illumination intensity and centroid from depressed key depths.
 */
export interface KeybedUnderglowMetrics {
  intensity: number;
  maxDepression: number;
  activeCount: number;
  avgX: number;
}

export function calculateKeybedUnderglow(
  activeDepressions: { pitch: number; depth: number }[]
): KeybedUnderglowMetrics {
  if (!activeDepressions || !Array.isArray(activeDepressions) || activeDepressions.length === 0) {
    return {
      intensity: 0.0,
      maxDepression: 0.0,
      activeCount: 0,
      avgX: 0,
    };
  }

  let totalDepth = 0;
  let maxDep = 0;
  let totalX = 0;
  let validCount = 0;

  for (const item of activeDepressions) {
    if (!item) continue;
    const depthVal = Number.isFinite(item.depth) ? item.depth : 0;
    const d = Math.max(0, Math.min(1.0, depthVal));
    if (d > 0.001) {
      const pitchVal = Number.isFinite(item.pitch) ? item.pitch : 60;
      totalDepth += d;
      if (d > maxDep) maxDep = d;
      totalX += getNoteX(pitchVal);
      validCount++;
    }
  }

  if (validCount === 0) {
    return {
      intensity: 0.0,
      maxDepression: 0.0,
      activeCount: 0,
      avgX: 0,
    };
  }

  const avgX = totalX / validCount;
  // Intensity scales smoothly with strike depth and chord density (capped at 4.5)
  const intensity = Math.min(4.5, maxDep * 2.2 + totalDepth * 0.45);

  return {
    intensity,
    maxDepression: maxDep,
    activeCount: validCount,
    avgX,
  };
}

/**
 * Calculates ripple splash wave expansion and opacity decay on the reflective floor.
 */
export interface RippleWaveMetrics {
  radius: number;
  opacity: number;
  zOffset: number;
}

export function calculateRippleWave(
  life: number,
  maxLife: number = 0.55,
  maxRadius: number = 3.6
): RippleWaveMetrics {
  const safeLife = Number.isFinite(life) ? life : 0;
  const safeMaxLife = Number.isFinite(maxLife) && maxLife > 0 ? maxLife : 0.55;
  const safeMaxRadius = Number.isFinite(maxRadius) && maxRadius >= 0.3 ? maxRadius : 3.6;

  if (safeLife <= 0) {
    return { radius: 0.3, opacity: 0.75, zOffset: 0 };
  }
  const progress = Math.min(1.0, Math.max(0, safeLife / safeMaxLife));
  const easeOut = 1 - Math.pow(1 - progress, 2); // quadratic ease-out

  const radius = 0.3 + (safeMaxRadius - 0.3) * easeOut;
  // Fades out gently towards completion
  const opacity = Math.max(0, (1 - progress) * 0.75);
  // Waves drift slightly backwards down the runway mirror
  const zOffset = -easeOut * 1.8;

  return {
    radius,
    opacity,
    zOffset,
  };
}
