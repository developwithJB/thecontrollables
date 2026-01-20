// PWA Install Detection Utilities

const STORAGE_KEY_DISMISSED = 'pwa_install_dismissed_at';
const STORAGE_KEY_SHOWN_COUNT = 'pwa_install_shown_count';
const DISMISS_COOLDOWN_DAYS = 14;
const MAX_SHOW_COUNT = 2;

/**
 * Check if the app is running in standalone mode (installed as PWA)
 */
export function isStandalone(): boolean {
  // iOS standalone mode
  if ('standalone' in navigator && (navigator as any).standalone === true) {
    return true;
  }
  // Standard display-mode media query
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  // Fullscreen mode (some Android installs)
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return true;
  }
  return false;
}

/**
 * Check if the device is running iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Check if the device is running Android
 */
export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

/**
 * Check if beforeinstallprompt is available (Android/Desktop Chrome)
 */
export function canPromptInstall(): boolean {
  return 'BeforeInstallPromptEvent' in window || deferredPromptAvailable;
}

// Store the deferred install prompt
let deferredInstallPrompt: any = null;
let deferredPromptAvailable = false;

/**
 * Initialize PWA install prompt listener
 * Call this early in the app lifecycle
 */
export function initInstallPromptListener(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser install prompt
    e.preventDefault();
    deferredInstallPrompt = e;
    deferredPromptAvailable = true;
  });

  // Track when app is installed
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    deferredPromptAvailable = false;
  });
}

/**
 * Trigger the native install prompt (Android/Desktop)
 */
export async function triggerInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredInstallPrompt) {
    return 'unavailable';
  }

  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  
  return outcome === 'accepted' ? 'accepted' : 'dismissed';
}

/**
 * Check if we have a stored deferred prompt
 */
export function hasDeferredPrompt(): boolean {
  return deferredInstallPrompt !== null;
}

/**
 * Get the number of times the install nudge has been shown
 */
export function getInstallShownCount(): number {
  const count = localStorage.getItem(STORAGE_KEY_SHOWN_COUNT);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Increment the shown count
 */
export function incrementInstallShownCount(): void {
  const current = getInstallShownCount();
  localStorage.setItem(STORAGE_KEY_SHOWN_COUNT, String(current + 1));
}

/**
 * Get the timestamp when install was last dismissed
 */
export function getInstallDismissedAt(): number | null {
  const timestamp = localStorage.getItem(STORAGE_KEY_DISMISSED);
  return timestamp ? parseInt(timestamp, 10) : null;
}

/**
 * Record that the user dismissed the install nudge
 */
export function setInstallDismissed(): void {
  localStorage.setItem(STORAGE_KEY_DISMISSED, String(Date.now()));
}

/**
 * Check if the install nudge can be shown based on timing rules
 */
export function canShowInstallNudge(): boolean {
  // Already installed
  if (isStandalone()) {
    return false;
  }

  // Shown too many times
  if (getInstallShownCount() >= MAX_SHOW_COUNT) {
    return false;
  }

  // Dismissed recently
  const dismissedAt = getInstallDismissedAt();
  if (dismissedAt) {
    const daysSinceDismissal = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissal < DISMISS_COOLDOWN_DAYS) {
      return false;
    }
  }

  return true;
}

/**
 * Check if user is on first session (based on session storage)
 */
export function isFirstSession(): boolean {
  const hasVisitedBefore = sessionStorage.getItem('pwa_has_session');
  if (!hasVisitedBefore) {
    sessionStorage.setItem('pwa_has_session', 'true');
    // Also check localStorage for true first-time visitors
    const everVisited = localStorage.getItem('pwa_ever_visited');
    if (!everVisited) {
      localStorage.setItem('pwa_ever_visited', 'true');
      return true;
    }
  }
  return false;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  }
}
