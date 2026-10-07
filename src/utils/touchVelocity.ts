/**
 * Vertical Touch Velocity Sensitivity:
 * Tapping low near front lip (ratio ~1) = forte 0.90 velocity
 * Tapping high near black key root (ratio ~0) = piano 0.45 velocity
 */
export function calculateKeyTouchVelocity(
  clientY: number,
  elementTop: number,
  elementHeight: number
): number {
  if (!elementHeight || elementHeight <= 0) return 0.85;
  const ratio = Math.max(0, Math.min(1, (clientY - elementTop) / elementHeight));
  return 0.45 + ratio * (0.9 - 0.45);
}
