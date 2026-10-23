import { useCallback, useState } from "react";

export const ALLOWANCE_REFRESH_TIMEOUT_MS = 5_000;

/** Bound UI waiting; never substitute a guessed allowance after a failed refresh. */
export async function refreshAllowanceWithin(
  refetch: () => Promise<{ isError?: boolean; error?: unknown }>,
  timeoutMs = ALLOWANCE_REFRESH_TIMEOUT_MS,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(refetch).then(result => !result.isError && !result.error),
      new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), timeoutMs); }),
    ]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function useAllowanceRefresh(refetch: () => Promise<{ isError?: boolean; error?: unknown }>) {
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const refresh = useCallback(async () => {
    setPending(true);
    const ok = await refreshAllowanceWithin(refetch);
    setFailed(!ok);
    setPending(false);
  }, [refetch]);
  return { failed, pending, refresh };
}
