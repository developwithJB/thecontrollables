
# Harden App for Production-Quality SaaS Experience

## Problem Summary

Based on the codebase analysis and user reports, there are three main categories of issues:

1. **Saving operations hang or feel slow** - Mutations may get stuck without proper timeout handling or user feedback
2. **App becomes buggy when returning after being open** - Stale state accumulates without proper visibility change handling
3. **Pull-to-refresh on iOS PWA locks the page** - The touch handling doesn't properly release scroll control after refresh completes

---

## Root Cause Analysis

### Issue 1: Saving Hangs
- The app has good timeout warnings (5-second `useAutoLoadingTimeout`) but they're only visual feedback
- No automatic retry or recovery mechanism exists
- The edge function `dashboard-summary` and mutations have no client-side timeout limits
- React Query mutations don't have abort controllers or timeout configuration

### Issue 2: Stale State on Resume
- No `visibilitychange` event handling anywhere in the codebase
- When app is backgrounded and resumed, cached data can be many hours old
- Multiple auth state listeners may accumulate without proper cleanup
- React Query's `refetchOnWindowFocus: false` prevents automatic refresh when returning

### Issue 3: Pull-to-Refresh Locks Page
- The `usePullToRefresh` hook uses `e.preventDefault()` during touch move (line 77)
- After refresh completes, scroll isn't explicitly re-enabled
- The `isRefreshing` state may not properly clear in all edge cases on iOS Safari
- iOS PWA has unique touch event handling quirks that require special consideration

---

## Technical Solution

### 1. Add Visibility Change Handler for App Resume

**Files:** `src/App.tsx`, new `src/hooks/useAppResume.ts`

Create a hook that detects when the app comes back into focus after being backgrounded and:
- Invalidates stale queries (older than 5 minutes)
- Refreshes auth session to prevent expired token issues
- Tracks the resume event for debugging

```typescript
// src/hooks/useAppResume.ts
export function useAppResume() {
  const queryClient = useQueryClient();
  const lastVisibleRef = useRef(Date.now());
  
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // App backgrounded - record time
        lastVisibleRef.current = Date.now();
      } else {
        // App resumed - check staleness
        const hiddenDuration = Date.now() - lastVisibleRef.current;
        const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
        
        if (hiddenDuration > STALE_THRESHOLD) {
          // Refresh auth session
          await supabase.auth.getSession();
          // Invalidate all active queries
          queryClient.invalidateQueries({ type: 'active' });
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [queryClient]);
}
```

### 2. Fix Pull-to-Refresh for iOS PWA

**File:** `src/hooks/usePullToRefresh.ts`

The current implementation has issues with iOS Safari's overscroll behavior. Fixes:

- Add explicit scroll restoration after refresh
- Use `touch-action: none` on the pulling element during pull
- Force reset all states with a cleanup mechanism
- Add iOS-specific detection and handling
- Ensure `e.preventDefault()` is only called when actively pulling

```typescript
// Key changes to usePullToRefresh.ts

// Add cleanup function that forcefully resets all state
const forceCleanup = useCallback(() => {
  setIsRefreshing(false);
  setPullDistance(0);
  setIsPulling(false);
  // Force restore scrolling on iOS
  if (containerRef.current) {
    containerRef.current.style.overflow = '';
    containerRef.current.style.touchAction = '';
  }
}, []);

// In handleTouchEnd - add explicit cleanup
const handleTouchEnd = () => {
  // Always restore touch action
  if (containerRef.current) {
    containerRef.current.style.touchAction = '';
  }
  
  if (pullDistance >= threshold) {
    handleRefresh();
  } else {
    setPullDistance(0);
  }
  setIsPulling(false);
};

// After refresh completes - force cleanup
try {
  await onRefresh();
} finally {
  clearTimeout(safetyTimeout);
  // Use requestAnimationFrame for smoother iOS behavior
  requestAnimationFrame(() => {
    setIsRefreshing(false);
    setPullDistance(0);
    // Restore scroll on iOS
    if (containerRef.current) {
      containerRef.current.style.overflow = '';
    }
  });
}
```

### 3. Add Mutation Timeout and Retry Logic

**File:** `src/hooks/useDashboardSummary.ts`

Wrap mutations with a timeout wrapper that:
- Aborts requests after 10 seconds
- Provides clear error feedback
- Prevents duplicate submissions

```typescript
// Add timeout wrapper for mutations
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), ms)
    )
  ]);
};

// In mutations, wrap the Supabase calls:
const { data, error } = await withTimeout(
  supabase.from("integrity_logs").insert({...}),
  10000 // 10 second timeout
);
```

### 4. Add React Error Boundary

**New file:** `src/components/ErrorBoundary.tsx`

Create a proper React error boundary that:
- Catches rendering errors
- Shows a recovery UI
- Logs errors to analytics
- Provides a "Refresh" action

```typescript
// src/components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Track error
    supabase.from("app_errors").insert({
      error_message: error.message,
      error_stack: error.stack,
      error_type: "react_boundary",
      component_name: errorInfo.componentStack,
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
          <h1>Something went wrong</h1>
          <p>Your progress is saved. Please refresh to continue.</p>
          <Button onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### 5. Improve Query Client Configuration

**File:** `src/App.tsx`

Enhance the query client with better defaults for production stability:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000, // Garbage collect after 5 mins
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Enable reconnect refetch
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      networkMode: 'offlineFirst', // Better offline handling
    },
    mutations: {
      retry: 0, // Don't auto-retry mutations
      networkMode: 'online', // Mutations require network
    },
  },
});
```

### 6. Add Connection Status Indicator

**File:** `src/components/OfflineIndicator.tsx`

Enhance to also detect slow/unstable connections:

```typescript
// Add slow connection detection
const [isSlowConnection, setIsSlowConnection] = useState(false);

useEffect(() => {
  const connection = (navigator as any).connection;
  if (connection) {
    const updateConnection = () => {
      setIsSlowConnection(
        connection.effectiveType === 'slow-2g' || 
        connection.effectiveType === '2g'
      );
    };
    connection.addEventListener('change', updateConnection);
    updateConnection();
  }
}, []);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add ErrorBoundary wrapper, enhance QueryClient config, add useAppResume |
| `src/hooks/usePullToRefresh.ts` | Fix iOS scroll lock, add force cleanup, improve touch handling |
| `src/hooks/useDashboardSummary.ts` | Add mutation timeout wrapper |
| `src/hooks/useAppResume.ts` (new) | Visibility change handler for stale state recovery |
| `src/components/ErrorBoundary.tsx` (new) | React error boundary with recovery UI |
| `src/components/OfflineIndicator.tsx` | Add slow connection detection |

---

## Expected Outcomes

1. **Saving reliability**: Clear timeout feedback and automatic error recovery
2. **App resume stability**: Automatic data refresh when returning after 5+ minutes
3. **Pull-to-refresh on iOS**: Proper scroll restoration after refresh completes
4. **Error recovery**: Graceful handling of React crashes with user-friendly recovery
5. **Connection awareness**: Better feedback for slow/unstable network conditions

---

## Testing Checklist

1. Open app, background it for 10+ minutes, return and verify data refreshes
2. Start a save operation, kill network, verify timeout feedback appears
3. Use pull-to-refresh on iOS, verify page scrolls normally after refresh
4. Trigger a React error, verify error boundary shows recovery UI
5. Test on slow 3G network, verify appropriate feedback is shown
