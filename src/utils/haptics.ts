/**
 * Android Native & Web Haptics Engine
 * Provides ultra-low latency tactile vibration feedback on touch and key strikes.
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'key' | 'success' | 'warning';

export const triggerHaptic = (type: HapticType = 'light'): void => {
  if (typeof window === 'undefined' || !('navigator' in window) || !navigator.vibrate) {
    return;
  }

  try {
    switch (type) {
      case 'key':
        // Crisp, ultra-short mechanical strike vibration for piano keys
        navigator.vibrate(8);
        break;
      case 'light':
        navigator.vibrate(12);
        break;
      case 'medium':
        navigator.vibrate(22);
        break;
      case 'heavy':
        navigator.vibrate(35);
        break;
      case 'success':
        // Double-tap pulse for combo / level clear
        navigator.vibrate([15, 30, 25]);
        break;
      case 'warning':
        // Triple-tap pulse for miss or error
        navigator.vibrate([20, 40, 20]);
        break;
      default:
        navigator.vibrate(10);
    }
  } catch {
    // Ignore any browser vibration permission restrictions
  }
};
