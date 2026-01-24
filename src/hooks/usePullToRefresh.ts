import { useState, useEffect, useCallback, useRef } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
}

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

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || disabled) return;
    
    setIsRefreshing(true);
    
    // Safety timeout to prevent infinite spinning (max 10 seconds)
    const safetyTimeout = setTimeout(() => {
      console.warn("Pull-to-refresh safety timeout triggered");
      setIsRefreshing(false);
      setPullDistance(0);
    }, 10000);
    
    try {
      await onRefresh();
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      clearTimeout(safetyTimeout);
      // Small delay for visual feedback
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 300);
    }
  }, [onRefresh, isRefreshing, disabled]);

  useEffect(() => {
    if (disabled) return;

    const container = containerRef.current;
    if (!container) return;

    let currentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start if at top of scroll
      if (container.scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || container.scrollTop > 0) {
        setPullDistance(0);
        return;
      }

      currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY.current);
      
      // Apply resistance for natural feel
      const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
      setPullDistance(resistedDistance);

      // Prevent scroll if pulling down
      if (distance > 10) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance >= threshold) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
      setIsPulling(false);
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isPulling, pullDistance, threshold, handleRefresh, disabled]);

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1),
    triggerRefresh: handleRefresh,
  };
}
