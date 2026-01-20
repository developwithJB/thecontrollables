import { useState, useEffect, useCallback } from "react";
import { generateFocusPlan, getLowestControllable, type FocusPlan, type UserBuildCurrent } from "@/lib/build";

const FOCUS_MODE_KEY = "controllables_focus_mode";

interface FocusModeState {
  active: boolean;
  controllable: string | null;
  startedAt: string | null;
}

export function useFocusMode(currentBuild: UserBuildCurrent | null) {
  const [focusState, setFocusState] = useState<FocusModeState>({
    active: false,
    controllable: null,
    startedAt: null,
  });
  const [focusPlan, setFocusPlan] = useState<FocusPlan | null>(null);

  // Load focus mode state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(FOCUS_MODE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as FocusModeState;
        setFocusState(parsed);
        if (parsed.active && parsed.controllable) {
          setFocusPlan(generateFocusPlan(parsed.controllable));
        }
      } catch {
        // Invalid stored data, ignore
      }
    }
  }, []);

  // Calculate current day of focus mode (1-7)
  const getCurrentDay = useCallback((): number => {
    if (!focusState.startedAt) return 1;
    const start = new Date(focusState.startedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(Math.max(diffDays + 1, 1), 7);
  }, [focusState.startedAt]);

  // Activate focus mode for the lowest controllable
  const activateFocusMode = useCallback((controllableOverride?: string) => {
    if (!currentBuild && !controllableOverride) return;
    
    const controllable = controllableOverride || 
      (currentBuild ? getLowestControllable(currentBuild) : "awareness");
    
    const newState: FocusModeState = {
      active: true,
      controllable,
      startedAt: new Date().toISOString(),
    };
    
    setFocusState(newState);
    setFocusPlan(generateFocusPlan(controllable));
    localStorage.setItem(FOCUS_MODE_KEY, JSON.stringify(newState));
  }, [currentBuild]);

  // Deactivate focus mode
  const deactivateFocusMode = useCallback(() => {
    setFocusState({
      active: false,
      controllable: null,
      startedAt: null,
    });
    setFocusPlan(null);
    localStorage.removeItem(FOCUS_MODE_KEY);
  }, []);

  // Get today's focus plan day
  const getTodaysPlan = useCallback(() => {
    if (!focusPlan) return null;
    const dayIndex = getCurrentDay() - 1;
    return focusPlan.days[dayIndex] || null;
  }, [focusPlan, getCurrentDay]);

  return {
    focusState,
    focusPlan,
    currentDay: getCurrentDay(),
    todaysPlan: getTodaysPlan(),
    activateFocusMode,
    deactivateFocusMode,
    isActive: focusState.active,
  };
}
