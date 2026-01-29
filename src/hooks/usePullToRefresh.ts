import { useState, useEffect, useCallback, useRef } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
}

// Detect iOS for specific handling
const isIOS = typeof navigator !== "undefined" && 
  /iPad|iPhone|iPod/.test(navigator.userAgent);

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isCleaningUp = useRef(false);

  // Force cleanup function that ensures all state is reset
  const forceCleanup = useCallback(() => {
    if (isCleaningUp.current) return;
    isCleaningUp.current = true;

    // Use requestAnimationFrame for smoother iOS behavior
    requestAnimationFrame(() => {
      setIsRefreshing(false);
      setPullDistance(0);
      setIsPulling(false);
      
      // Force restore scrolling on iOS
      if (containerRef.current) {
        containerRef.current.style.overflow = "";
        containerRef.current.style.touchAction = "";
        containerRef.current.style.overscrollBehavior = "";
      }
      
      // Reset body styles that might have been affected
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      
      isCleaningUp.current = false;
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || disabled) return;
    
    setIsRefreshing(true);
    
    // Safety timeout to prevent infinite spinning (max 8 seconds)
    const safetyTimeout = setTimeout(() => {
      console.warn("[PullToRefresh] Safety timeout triggered after 8 seconds");
      forceCleanup();
    }, 8000);
    
    try {
      await onRefresh();
    } catch (error) {
      console.error("[PullToRefresh] Refresh error:", error);
    } finally {
      clearTimeout(safetyTimeout);
      
      // Small delay for visual feedback, then force cleanup
      setTimeout(() => {
        forceCleanup();
      }, 300);
    }
  }, [onRefresh, isRefreshing, disabled, forceCleanup]);

  useEffect(() => {
    if (disabled) return;

    const container = containerRef.current;
    if (!container) return;

    let currentY = 0;
    let activePull = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start if at top of scroll and not already refreshing
      if (container.scrollTop <= 0 && !isRefreshing) {
        startY.current = e.touches[0].clientY;
        activePull = true;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!activePull || container.scrollTop > 0 || isRefreshing) {
        setPullDistance(0);
        return;
      }

      currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY.current);
      
      // Apply resistance for natural feel
      const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
      setPullDistance(resistedDistance);

      // Only prevent default scroll if we're actively pulling down significantly
      // This prevents the page from getting locked
      if (distance > 10 && resistedDistance > 0) {
        // On iOS, we need to be more careful about preventDefault
        if (isIOS) {
          // Only prevent default if we're clearly pulling, not scrolling
          if (distance > 20) {
            e.preventDefault();
          }
        } else {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      // Always restore touch action immediately
      if (container) {
        container.style.touchAction = "";
        container.style.overflow = "";
      }

      if (pullDistance >= threshold && !isRefreshing) {
        handleRefresh();
      } else {
        // Smooth reset
        setPullDistance(0);
      }
      
      activePull = false;
      setIsPulling(false);
    };

    // Handle touch cancel (e.g., notification or gesture interrupt)
    const handleTouchCancel = () => {
      activePull = false;
      forceCleanup();
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    // Cleanup on unmount
    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchCancel);
      
      // Ensure styles are reset
      container.style.overflow = "";
      container.style.touchAction = "";
    };
  }, [isPulling, pullDistance, threshold, handleRefresh, disabled, isRefreshing, forceCleanup]);

  // Additional safety: cleanup when component is visible but stuck
  useEffect(() => {
    if (!isRefreshing) return;

    // If refreshing takes too long, force cleanup
    const emergencyTimeout = setTimeout(() => {
      console.warn("[PullToRefresh] Emergency cleanup triggered");
      forceCleanup();
    }, 10000);

    return () => clearTimeout(emergencyTimeout);
  }, [isRefreshing, forceCleanup]);

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1),
    triggerRefresh: handleRefresh,
    forceCleanup, // Expose for manual cleanup if needed
  };
}
