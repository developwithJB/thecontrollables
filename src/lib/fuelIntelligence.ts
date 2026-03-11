import type { CalendarIntelligence } from "./calendarIntelligence";

export type MealFit = "quick_easy" | "recovery_friendly" | "high_protein" | "prep_friendly" | "standard";

export interface FuelIntelligence {
  mealFit: MealFit;
  suggestion: string;
  dinnerAdvice: string | null;
  tags: string[];
}

interface FuelInput {
  recovery?: number | null;
  sleepMinutes?: number | null;
  strain?: number | null;
  calendarDayType?: string | null;
  meetingCount?: number;
  hasMeals: boolean;
  mealCount: number;
}

const MEAL_FIT_LABELS: Record<MealFit, string> = {
  quick_easy: "Quick & easy",
  recovery_friendly: "Recovery-friendly",
  high_protein: "High protein",
  prep_friendly: "Prep-friendly",
  standard: "Standard",
};

export function getFuelIntelligence(input: FuelInput): FuelIntelligence {
  const { recovery, sleepMinutes, strain, calendarDayType, meetingCount = 0, hasMeals, mealCount } = input;

  let mealFit: MealFit = "standard";
  let suggestion = "";
  let dinnerAdvice: string | null = null;
  const tags: string[] = [];

  const lowRecovery = recovery != null && recovery < 40;
  const strongRecovery = recovery != null && recovery >= 66;
  const poorSleep = sleepMinutes != null && sleepMinutes < 360; // < 6h
  const highStrain = strain != null && strain > 14;
  const heavyDay = calendarDayType === "heavy" || calendarDayType === "admin_heavy";
  const fragmentedDay = calendarDayType === "fragmented";
  const lightDay = calendarDayType === "light" || calendarDayType === "focus" || calendarDayType === "recovery_window";

  // Priority 1: Low recovery
  if (lowRecovery) {
    mealFit = "recovery_friendly";
    suggestion = "Low recovery — choose easy, supportive meals today.";
    tags.push("recovery_friendly", "low_effort", "nutrient_dense");
    dinnerAdvice = hasMeals
      ? "Recovery is low — keep tonight's meal simple and nourishing."
      : "Recovery is low — plan something easy for dinner.";
  }
  // Priority 2: High strain
  else if (highStrain) {
    mealFit = "high_protein";
    suggestion = "High strain today — prioritize protein and recovery support.";
    tags.push("high_protein", "recovery_friendly");
    dinnerAdvice = "High strain day — a protein-rich dinner supports recovery.";
  }
  // Priority 3: Poor sleep
  else if (poorSleep) {
    mealFit = "quick_easy";
    suggestion = "Sleep was short — choose something familiar and easy.";
    tags.push("quick_easy", "comfort", "familiar");
    dinnerAdvice = "Sleep was short — choose something familiar and easy tonight.";
  }
  // Priority 4: Heavy/fragmented calendar
  else if (heavyDay || fragmentedDay) {
    mealFit = "quick_easy";
    suggestion = heavyDay
      ? "Packed schedule — reduce prep effort on meals today."
      : "Fragmented day — keep meals simple to avoid decision fatigue.";
    tags.push("quick_easy", "low_effort", "minimal_prep");
    dinnerAdvice = "Busy evening ahead — tonight's plan may need a simpler swap.";
  }
  // Priority 5: Light day + strong recovery
  else if (lightDay && strongRecovery) {
    mealFit = "prep_friendly";
    suggestion = "Light schedule + strong readiness — good day for cooking or prep.";
    tags.push("prep_friendly", "batch_cooking", "higher_effort_ok");
    dinnerAdvice = "Light evening + strong readiness — good time for a higher-prep meal.";
  }
  // Default
  else {
    mealFit = "standard";
    suggestion = "";
    tags.push("balanced");
    dinnerAdvice = null;
  }

  return { mealFit, suggestion, dinnerAdvice, tags };
}

export function getFuelContextLabel(intel: FuelIntelligence): string | null {
  if (intel.mealFit === "standard") return null;
  const labels: Record<MealFit, string> = {
    quick_easy: "⚡ Quick mode — suggesting easier meals",
    recovery_friendly: "🔋 Recovery mode — suggesting easier meals",
    high_protein: "💪 High strain — suggesting protein-focused meals",
    prep_friendly: "🍳 Prep day — good conditions for cooking",
    standard: "",
  };
  return labels[intel.mealFit];
}
