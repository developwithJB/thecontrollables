export type ArchetypeInfo = { label: string; description: string };

export const ARCHETYPE_LABELS: Record<string, ArchetypeInfo> = {
  stable_build: {
    label: "Stable Build",
    description: "All systems functioning well. Maintain and optimize.",
  },
  driven_but_depleting: {
    label: "Driven but Depleting",
    description: "Strong on habits, but running low on energy. Prioritize recovery.",
  },
  clear_but_fighting_friction: {
    label: "Clear but Fighting Friction",
    description: "High awareness, but your environment works against you. Redesign your surroundings.",
  },
  capable_but_inconsistent: {
    label: "Capable but Inconsistent",
    description: "Good energy, but missing reps. Focus on showing up daily.",
  },
  custom_build: {
    label: "Custom Build",
    description: "Your unique pattern. Review your scores to find opportunities.",
  },
};

export function getArchetypeInfo(key: string | null): ArchetypeInfo {
  if (!key) return ARCHETYPE_LABELS.custom_build;
  return ARCHETYPE_LABELS[key] || ARCHETYPE_LABELS.custom_build;
}

export interface BuildQuestion {
  id: string;
  controllable: string;
  question_key: string;
  prompt: string;
  order_index: number;
}

export interface UserBuildCurrent {
  user_id: string;
  awareness: number;
  perspective: number;
  habit: number;
  wellness: number;
  environment: number;
  overall: number;
  build_archetype_key: string | null;
  last_assessment_id: string | null;
  updated_at: string;
}

export interface BuildScore {
  id: string;
  assessment_id: string;
  user_id: string;
  awareness: number;
  perspective: number;
  habit: number;
  wellness: number;
  environment: number;
  overall: number;
  build_archetype_key: string;
  computed_at: string;
}
