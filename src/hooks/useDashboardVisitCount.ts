import { useState, useEffect } from "react";

const STORAGE_KEY = "dashboard_visit_count";

/**
 * Tracks the number of times the user has visited the dashboard.
 * Increments on mount and persists to localStorage.
 */
export function useDashboardVisitCount(): number {
  const [visitCount] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const count = stored ? parseInt(stored, 10) + 1 : 1;
      localStorage.setItem(STORAGE_KEY, count.toString());
      return count;
    } catch {
      // localStorage might not be available (SSR, private browsing, etc.)
      return 1;
    }
  });

  return visitCount;
}
