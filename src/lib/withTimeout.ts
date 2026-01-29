/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the specified time, it rejects with a timeout error.
 * 
 * @param promise - The promise to wrap
 * @param ms - Timeout in milliseconds (default: 10000)
 * @param errorMessage - Custom error message for timeout
 * @returns The wrapped promise
 */
export function withTimeout<T>(
  promise: Promise<T>, 
  ms: number = 10000,
  errorMessage: string = "Request timed out"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(errorMessage));
      }, ms);
      
      // Clean up timeout if promise resolves first
      promise.finally(() => clearTimeout(timeoutId));
    })
  ]);
}

/**
 * Creates a timeout-wrapped mutation function for Supabase operations.
 * Useful for ensuring mutations don't hang indefinitely.
 * 
 * @param fn - The async function to wrap
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns Wrapped function with timeout
 */
export function withMutationTimeout<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  timeoutMs: number = 10000
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs) => {
    return withTimeout(fn(...args), timeoutMs, "Save operation timed out. Please try again.");
  };
}
