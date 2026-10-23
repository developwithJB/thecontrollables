import { useCallback, useMemo, useRef, type ReactNode } from "react";
import { PracticeExitContext, type ExitGuard } from "@/hooks/usePracticeExitConfirmation";

/** Destructive account actions ask the mounted editor before changing auth or caches. */
export function PracticeExitProvider({ children }: { children: ReactNode }) {
  const guard = useRef<ExitGuard | null>(null);
  const register = useCallback((next: ExitGuard) => {
    guard.current = next;
    return () => { if (guard.current === next) guard.current = null; };
  }, []);
  const confirmExit = useCallback(() => guard.current?.confirm() ?? Promise.resolve(true), []);
  const resetExitConfirmation = useCallback(() => guard.current?.reset(), []);
  const value = useMemo(() => ({ confirmExit, register, resetExitConfirmation }), [confirmExit, register, resetExitConfirmation]);
  return <PracticeExitContext.Provider value={value}>{children}</PracticeExitContext.Provider>;
}
