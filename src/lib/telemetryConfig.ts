/** Enable only after JB verifies ownership of the destination project. */
export function isPosthogEnabled(): boolean {
  return (
    import.meta.env.VITE_ENABLE_POSTHOG === "true" &&
    !!import.meta.env.VITE_POSTHOG_KEY
  );
}
