// Re-export everything from snapshots for backward compatibility
// The Snapshots system replaces the old Guided Journeys / Foundation system

export * from "./snapshots";

// Additional backward-compatible types
export type { GuidedJourney, DailyAction } from "./snapshots";
