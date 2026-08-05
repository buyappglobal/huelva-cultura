export type TouchMode = 'standard' | 'anti_shake' | 'precision';

export interface TouchSettings {
  hapticIntensity: number; // 0, 0.5, 1.0, 1.5
  touchMode: TouchMode;
  touchDelayMs: number;
  dragThresholdPx: number;
}

export function getTouchSettings(): TouchSettings {
  if (typeof window === 'undefined') {
    return { hapticIntensity: 1.0, touchMode: 'standard', touchDelayMs: 0, dragThresholdPx: 12 };
  }

  const intensityStr = localStorage.getItem('aura_haptic_intensity');
  const intensity = intensityStr !== null ? parseFloat(intensityStr) : 1.0;
  const mode = (localStorage.getItem('aura_touch_mode') || 'standard') as TouchMode;

  let delay = 0;
  let threshold = 12;

  if (mode === 'anti_shake') {
    delay = 150;
    threshold = 24;
  } else if (mode === 'precision') {
    delay = 280;
    threshold = 34;
  }

  return {
    hapticIntensity: isNaN(intensity) ? 1.0 : intensity,
    touchMode: mode,
    touchDelayMs: delay,
    dragThresholdPx: threshold
  };
}

export function setTouchSettings(settings: { hapticIntensity?: number; touchMode?: TouchMode }) {
  if (typeof window === 'undefined') return;

  if (settings.hapticIntensity !== undefined) {
    localStorage.setItem('aura_haptic_intensity', String(settings.hapticIntensity));
  }
  if (settings.touchMode !== undefined) {
    localStorage.setItem('aura_touch_mode', settings.touchMode);
  }

  window.dispatchEvent(new CustomEvent('aura-touch-settings-changed', { detail: getTouchSettings() }));
}

export const triggerHaptic = (pattern: number | number[] = 10) => {
  if (typeof window === 'undefined' || !window.navigator || !window.navigator.vibrate) return;

  const settings = getTouchSettings();
  if (settings.hapticIntensity <= 0) return;

  let scaledPattern: number | number[];
  if (typeof pattern === 'number') {
    scaledPattern = Math.max(1, Math.round(pattern * settings.hapticIntensity));
  } else {
    scaledPattern = pattern.map(p => Math.max(1, Math.round(p * settings.hapticIntensity)));
  }

  try {
    window.navigator.vibrate(scaledPattern);
  } catch {
    // Ignore unsupported device errors
  }
};
