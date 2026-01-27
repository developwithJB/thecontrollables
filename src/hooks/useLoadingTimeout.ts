import { useState, useEffect, useCallback, useRef } from "react";

interface UseLoadingTimeoutOptions {
  /** Timeout duration in milliseconds (default: 5000) */
  timeoutMs?: number;
  /** Optional context for logging (e.g., module name) */
  context?: string;
  /** Whether to show console warnings (default: true) */
  showWarning?: boolean;
}

interface UseLoadingTimeoutReturn {
  /** Whether the timeout has been triggered */
  isTimedOut: boolean;
  /** Start tracking a loading state */
  startLoading: () => void;
  /** Stop tracking (loading completed) */
  stopLoading: () => void;
  /** Reset timeout state */
  reset: () => void;
}

/**
 * Hook to track loading states and warn when they exceed a threshold.
 * Use this to detect stuck loading states and provide user feedback.
 * 
 * @example
 * const { isTimedOut, startLoading, stopLoading } = useLoadingTimeout({
 *   timeoutMs: 5000,
 *   context: "BuildAssessment",
 * });
 * 
 * useEffect(() => {
 *   if (isLoading) startLoading();
 *   else stopLoading();
 * }, [isLoading]);
 * 
 * if (isTimedOut) {
 *   return <TimeoutWarning />;
 * }
 */
export function useLoadingTimeout({
  timeoutMs = 5000,
  context = "Module",
  showWarning = true,
}: UseLoadingTimeoutOptions = {}): UseLoadingTimeoutReturn {
  const [isTimedOut, setIsTimedOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startLoading = useCallback(() => {
    clearTimeoutRef();
    setIsTimedOut(false);
    startTimeRef.current = Date.now();

    timeoutRef.current = setTimeout(() => {
      setIsTimedOut(true);
      if (showWarning) {
        console.warn(
          `[LoadingTimeout] ${context} has been loading for more than ${timeoutMs / 1000}s. ` +
          `This may indicate a stuck state.`
        );
      }
    }, timeoutMs);
  }, [clearTimeoutRef, context, timeoutMs, showWarning]);

  const stopLoading = useCallback(() => {
    clearTimeoutRef();
    
    // Log if loading took too long but eventually completed
    if (startTimeRef.current && showWarning) {
      const duration = Date.now() - startTimeRef.current;
      if (duration > timeoutMs) {
        console.info(
          `[LoadingTimeout] ${context} completed after ${(duration / 1000).toFixed(1)}s (exceeded ${timeoutMs / 1000}s threshold)`
        );
      }
    }
    
    startTimeRef.current = null;
    setIsTimedOut(false);
  }, [clearTimeoutRef, context, timeoutMs, showWarning]);

  const reset = useCallback(() => {
    clearTimeoutRef();
    setIsTimedOut(false);
    startTimeRef.current = null;
  }, [clearTimeoutRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeoutRef();
    };
  }, [clearTimeoutRef]);

  return {
    isTimedOut,
    startLoading,
    stopLoading,
    reset,
  };
}

/**
 * Simplified hook that automatically tracks a loading boolean
 */
export function useAutoLoadingTimeout(
  isLoading: boolean,
  options: UseLoadingTimeoutOptions = {}
): { isTimedOut: boolean } {
  const { isTimedOut, startLoading, stopLoading } = useLoadingTimeout(options);

  useEffect(() => {
    if (isLoading) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [isLoading, startLoading, stopLoading]);

  return { isTimedOut };
}
