/**
 * Utility functions to check PWA standalone / installation status
 * and trigger installation workflows across the app.
 */

export const isPWAInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
  const isNavigatorStandalone = (window.navigator as any).standalone === true;
  const isReferrerAndroidApp = document.referrer.includes('android-app://');
  const isStoredInstalled = localStorage.getItem('aura_pwa_installed') === 'true';

  return isStandaloneMatch || isNavigatorStandalone || isReferrerAndroidApp || isStoredInstalled;
};

export const triggerZenInstallModal = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('trigger-pwa-zen-incentive'));
};
