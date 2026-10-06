import type { StrikeRating, StrikeFeedback, PerformanceScore } from '../types';

export const STRIKE_WINDOWS = {
  PERFECT_MS: 30, // within ±30ms
  GREAT_MS: 70,   // within ±70ms
  EARLY_MAX_MS: 150, // struck ahead between -70ms and -150ms
  LATE_MAX_MS: 200,  // struck late between +70ms and +200ms
};

export const BASE_POINTS: Record<StrikeRating, number> = {
  PERFECT: 100,
  GREAT: 75,
  EARLY: 40,
  LATE: 40,
  MISS: 0,
};

export function getComboMultiplier(streak: number): number {
  if (streak >= 50) return 8;
  if (streak >= 25) return 4;
  if (streak >= 10) return 2;
  return 1;
}

export function evaluateStrikeTiming(offsetMs: number): StrikeRating {
  const absOffset = Math.abs(offsetMs);

  if (absOffset <= STRIKE_WINDOWS.PERFECT_MS) {
    return 'PERFECT';
  }
  if (absOffset <= STRIKE_WINDOWS.GREAT_MS) {
    return 'GREAT';
  }
  if (offsetMs < -STRIKE_WINDOWS.GREAT_MS && offsetMs >= -STRIKE_WINDOWS.EARLY_MAX_MS) {
    return 'EARLY';
  }
  if (offsetMs > STRIKE_WINDOWS.GREAT_MS && offsetMs <= STRIKE_WINDOWS.LATE_MAX_MS) {
    return 'LATE';
  }
  return 'MISS';
}

export function calculateAccuracy(score: PerformanceScore): number {
  const total =
    score.perfectCount +
    score.greatCount +
    score.earlyCount +
    score.lateCount +
    score.missCount;

  if (total === 0) return 100;

  const weightedPoints =
    score.perfectCount * 1.0 +
    score.greatCount * 0.75 +
    (score.earlyCount + score.lateCount) * 0.4;

  const acc = (weightedPoints / total) * 100;
  return Math.max(0, Math.min(100, Math.round(acc * 10) / 10));
}

export function calculateStarRating(accuracy: number): {
  stars: number;
  rank: 'Virtuoso' | 'Maestro' | 'Pianist' | 'Apprentice' | 'Novice';
  label: string;
} {
  if (accuracy >= 95) {
    return { stars: 5, rank: 'Virtuoso', label: 'Virtuoso Perfection' };
  }
  if (accuracy >= 85) {
    return { stars: 4, rank: 'Maestro', label: 'Maestro Class' };
  }
  if (accuracy >= 70) {
    return { stars: 3, rank: 'Pianist', label: 'Accomplished Pianist' };
  }
  if (accuracy >= 50) {
    return { stars: 2, rank: 'Apprentice', label: 'Rising Apprentice' };
  }
  return { stars: 1, rank: 'Novice', label: 'Musical Explorer' };
}

export class ScoreKeeper {
  private state: PerformanceScore;

  constructor(totalNotes: number = 0) {
    this.state = {
      score: 0,
      streak: 0,
      maxStreak: 0,
      multiplier: 1,
      perfectCount: 0,
      greatCount: 0,
      earlyCount: 0,
      lateCount: 0,
      missCount: 0,
      totalNotes,
      accuracy: 100,
    };
  }

  public reset(totalNotes?: number): void {
    const total = totalNotes !== undefined ? totalNotes : this.state.totalNotes;
    this.state = {
      score: 0,
      streak: 0,
      maxStreak: 0,
      multiplier: 1,
      perfectCount: 0,
      greatCount: 0,
      earlyCount: 0,
      lateCount: 0,
      missCount: 0,
      totalNotes: total,
      accuracy: 100,
    };
  }

  public setTotalNotes(total: number): void {
    this.state.totalNotes = Math.max(0, total);
  }

  public registerHit(pitch: number, offsetMs: number): StrikeFeedback {
    const rating = evaluateStrikeTiming(offsetMs);
    return this.applyRating(rating, pitch, offsetMs);
  }

  public registerMiss(pitch: number = 0): StrikeFeedback {
    return this.applyRating('MISS', pitch, 999);
  }

  private applyRating(rating: StrikeRating, pitch: number, offsetMs: number): StrikeFeedback {
    if (rating === 'MISS') {
      this.state.streak = 0;
      this.state.multiplier = 1;
      this.state.missCount += 1;
    } else {
      this.state.streak += 1;
      if (this.state.streak > this.state.maxStreak) {
        this.state.maxStreak = this.state.streak;
      }
      this.state.multiplier = getComboMultiplier(this.state.streak);

      if (rating === 'PERFECT') this.state.perfectCount += 1;
      else if (rating === 'GREAT') this.state.greatCount += 1;
      else if (rating === 'EARLY') this.state.earlyCount += 1;
      else if (rating === 'LATE') this.state.lateCount += 1;
    }

    const basePts = BASE_POINTS[rating];
    const pointsGained = rating === 'MISS' ? 0 : basePts * this.state.multiplier;
    this.state.score += pointsGained;
    this.state.accuracy = calculateAccuracy(this.state);

    return {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      rating,
      points: pointsGained,
      offsetMs,
      timestamp: Date.now(),
      pitch,
      combo: this.state.streak,
      multiplier: this.state.multiplier,
    };
  }

  public getState(): PerformanceScore {
    return { ...this.state };
  }
}
