// App version management
// Increment this when deploying significant updates
// Format: MAJOR.MINOR.PATCH (e.g., 1.2.3)
// - MAJOR: Breaking changes or major feature overhauls
// - MINOR: New features, significant improvements
// - PATCH: Bug fixes, small improvements
export const APP_VERSION = "1.5.0";

// Check if running as installed PWA
export const isStandalonePWA = (): boolean => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
};

// Get stored version from localStorage
export const getStoredVersion = (): string | null => {
  return localStorage.getItem("app_version");
};

// Store current version
export const storeVersion = (): void => {
  localStorage.setItem("app_version", APP_VERSION);
};

// Check if update is available
export const isUpdateAvailable = (): boolean => {
  const storedVersion = getStoredVersion();
  if (!storedVersion) {
    // First time user, store version and don't prompt
    storeVersion();
    return false;
  }
  return storedVersion !== APP_VERSION;
};

// Force refresh for update
export const applyUpdate = (): void => {
  storeVersion();
  // Clear service worker cache and reload
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.update();
      });
    });
  }
  // Force hard reload
  window.location.reload();
};
