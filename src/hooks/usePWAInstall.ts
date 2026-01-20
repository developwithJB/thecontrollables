import { useState, useEffect, useCallback } from 'react';
import {
  isStandalone,
  isIOS,
  canShowInstallNudge,
  isFirstSession,
  incrementInstallShownCount,
  setInstallDismissed,
  triggerInstallPrompt,
  hasDeferredPrompt,
} from '@/lib/pwa';

interface UsePWAInstallOptions {
  isAuthenticated: boolean;
  hasCompletedMeaningfulAction: boolean;
}

interface UsePWAInstallReturn {
  showNudge: boolean;
  isIOSDevice: boolean;
  canTriggerNativePrompt: boolean;
  handleInstall: () => Promise<void>;
  handleDismiss: () => void;
}

export function usePWAInstall({
  isAuthenticated,
  hasCompletedMeaningfulAction,
}: UsePWAInstallOptions): UsePWAInstallReturn {
  const [showNudge, setShowNudge] = useState(false);
  const [canTriggerNativePrompt, setCanTriggerNativePrompt] = useState(false);
  const isIOSDevice = isIOS();

  // Check if we should show the nudge
  useEffect(() => {
    // Must be authenticated
    if (!isAuthenticated) {
      setShowNudge(false);
      return;
    }

    // Must have completed a meaningful action
    if (!hasCompletedMeaningfulAction) {
      setShowNudge(false);
      return;
    }

    // Already installed
    if (isStandalone()) {
      setShowNudge(false);
      return;
    }

    // Don't show on first session
    if (isFirstSession()) {
      setShowNudge(false);
      return;
    }

    // Check timing rules (show count, dismissal cooldown)
    if (!canShowInstallNudge()) {
      setShowNudge(false);
      return;
    }

    // For non-iOS, we need the deferred prompt to be available
    if (!isIOSDevice && !hasDeferredPrompt()) {
      // Still show for iOS which has manual instructions
      setShowNudge(false);
      return;
    }

    // All checks passed - show with a slight delay for better UX
    const timer = setTimeout(() => {
      setShowNudge(true);
      incrementInstallShownCount();
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, hasCompletedMeaningfulAction, isIOSDevice]);

  // Track if native prompt is available
  useEffect(() => {
    const checkPrompt = () => {
      setCanTriggerNativePrompt(hasDeferredPrompt());
    };

    checkPrompt();
    
    // Re-check periodically as the beforeinstallprompt event might fire later
    const interval = setInterval(checkPrompt, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!isIOSDevice && canTriggerNativePrompt) {
      const result = await triggerInstallPrompt();
      if (result === 'accepted') {
        setShowNudge(false);
      } else if (result === 'dismissed') {
        setInstallDismissed();
        setShowNudge(false);
      }
    }
    // For iOS, the nudge shows instructions instead of a button action
  }, [isIOSDevice, canTriggerNativePrompt]);

  const handleDismiss = useCallback(() => {
    setInstallDismissed();
    setShowNudge(false);
  }, []);

  return {
    showNudge,
    isIOSDevice,
    canTriggerNativePrompt,
    handleInstall,
    handleDismiss,
  };
}
