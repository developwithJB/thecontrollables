import {
  addMonths,
  addYears,
  differenceInCalendarDays,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import {
  SNAPSHOTS,
  getSnapshotsByBucket,
  type BucketId,
  type Controllable,
  type Snapshot,
} from "./snapshots";

export interface AgeBreakdown {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

export type LifeSeasonKey = "spring" | "summer" | "autumn" | "winter";

export interface LifeSeasonMapping {
  key: LifeSeasonKey;
  label: string;
  headline: string;
  description: string;
  reflection: string;
  recommendedControllable: Controllable;
  supportControllables: Controllable[];
  recommendedBucketId: BucketId;
}

export interface RegionDescriptor {
  label: string;
  description: string;
}

export interface SnapshotRecommendation {
  snapshot: Snapshot;
  alternatives: Snapshot[];
  region: RegionDescriptor;
}

const REFERENCE_YEAR_DAYS = 365.2425;

const REGION_BY_BUCKET: Record<BucketId, RegionDescriptor> = {
  "reset-reentry": {
    label: "The Return",
    description: "A calmer region for getting your footing back.",
  },
  "momentum-consistency": {
    label: "The Climb",
    description: "A region built around rhythm, reps, and steadier follow-through.",
  },
  "clarity-perspective": {
    label: "The Overlook",
    description: "A wider-view region for clearing noise and finding the real signal.",
  },
  "energy-care": {
    label: "The Hearth",
    description: "A restorative region for protecting energy and rebuilding steadiness.",
  },
  "integrity-trust": {
    label: "The Forge",
    description: "A region for rebuilding self-trust through kept promises.",
  },
  "growth-expansion": {
    label: "The Wilds",
    description: "An exploratory region for growth, stretch, and new capacity.",
  },
};

export function normalizeBirthDate(input: string | Date): Date | null {
  if (!input) return null;
  const parsed = input instanceof Date ? input : parseISO(input);
  if (!isValid(parsed)) return null;
  return startOfDay(parsed);
}

export function getAgeInYearsMonthsDays(
  birthDate: string | Date,
  now: Date = new Date(),
): AgeBreakdown | null {
  const birth = normalizeBirthDate(birthDate);
  const today = startOfDay(now);

  if (!birth || birth > today) return null;

  const years = differenceInYears(today, birth);
  const afterYears = addYears(birth, years);
  const months = differenceInMonths(today, afterYears);
  const afterMonths = addMonths(afterYears, months);
  const days = differenceInDays(today, afterMonths);

  return {
    years,
    months,
    days,
    totalDays: differenceInCalendarDays(today, birth),
  };
}

export function formatAgeInYearsMonthsDays(age: AgeBreakdown | null): string {
  if (!age) return "";

  const yearLabel = `${age.years} year${age.years === 1 ? "" : "s"}`;
  const monthLabel = `${age.months} month${age.months === 1 ? "" : "s"}`;
  const dayLabel = `${age.days} day${age.days === 1 ? "" : "s"}`;

  return `${yearLabel}, ${monthLabel}, ${dayLabel}`;
}

export function getWeeksLived(
  birthDate: string | Date,
  now: Date = new Date(),
): number {
  const age = getAgeInYearsMonthsDays(birthDate, now);
  if (!age) return 0;
  return Math.floor(age.totalDays / 7);
}

export function getLifePercentage(
  birthDate: string | Date,
  now: Date = new Date(),
  referenceYears = 80,
): number {
  const age = getAgeInYearsMonthsDays(birthDate, now);
  if (!age) return 0;

  const referenceDays = referenceYears * REFERENCE_YEAR_DAYS;
  const rawPercentage = (age.totalDays / referenceDays) * 100;
  const boundedPercentage = Math.max(0, Math.min(100, rawPercentage));

  return Number(boundedPercentage.toFixed(1));
}

export function getSeasonOfLifeMapping(
  birthDate: string | Date,
  now: Date = new Date(),
  referenceYears = 80,
): LifeSeasonMapping | null {
  const percentage = getLifePercentage(birthDate, now, referenceYears);
  if (!percentage) return null;

  if (percentage < 25) {
    return {
      key: "spring",
      label: "Life Spring",
      headline: "A season of beginnings and honest discovery",
      description:
        "This part of life is often about learning your own rhythm, testing what fits, and building early roots.",
      reflection:
        "Spring benefits from attention before acceleration. Notice what is actually yours.",
      recommendedControllable: "awareness",
      supportControllables: ["awareness", "habit"],
      recommendedBucketId: "growth-expansion",
    };
  }

  if (percentage < 50) {
    return {
      key: "summer",
      label: "Life Summer",
      headline: "A season of building, committing, and showing up",
      description:
        "This stretch of life often carries responsibility, momentum, and the need for structure that can actually hold.",
      reflection:
        "Summer tends to reward consistency more than intensity. What you repeat starts to shape you.",
      recommendedControllable: "habit",
      supportControllables: ["habit", "environment"],
      recommendedBucketId: "momentum-consistency",
    };
  }

  if (percentage < 75) {
    return {
      key: "autumn",
      label: "Life Autumn",
      headline: "A season of refinement, pruning, and clearer priorities",
      description:
        "This phase often asks for discernment: less noise, better tradeoffs, and a wiser relationship with time.",
      reflection:
        "Autumn is rarely about doing more. It is often about seeing more clearly and keeping what still matters.",
      recommendedControllable: "perspective",
      supportControllables: ["perspective", "environment"],
      recommendedBucketId: "clarity-perspective",
    };
  }

  return {
    key: "winter",
    label: "Life Winter",
    headline: "A season of protection, depth, and steadier energy",
    description:
      "This phase often benefits from a gentler pace, stronger boundaries, and more intentional care for the body and mind.",
    reflection:
      "Winter is not an ending story. It is a season that rewards presence, simplicity, and preserving what matters most.",
    recommendedControllable: "wellness",
    supportControllables: ["wellness", "awareness"],
    recommendedBucketId: "energy-care",
  };
}

export function getRegionForBucket(bucketId: BucketId): RegionDescriptor {
  return REGION_BY_BUCKET[bucketId];
}

export function recommendSnapshotForSeasonNeed(
  season: LifeSeasonMapping,
  controllable: Controllable,
): SnapshotRecommendation {
  const seasonalCandidates = getSnapshotsByBucket(season.recommendedBucketId);
  const focusCandidates = SNAPSHOTS.filter((snapshot) => snapshot.focus === controllable);

  const snapshot =
    seasonalCandidates.find((candidate) => candidate.focus === controllable) ||
    focusCandidates.find((candidate) => candidate.bucketId === season.recommendedBucketId) ||
    focusCandidates[0] ||
    seasonalCandidates[0] ||
    SNAPSHOTS[0];

  const alternatives = Array.from(
    new Map(
      [
        ...seasonalCandidates,
        ...focusCandidates,
        ...SNAPSHOTS.filter((candidate) => candidate.bucketId === snapshot.bucketId),
      ]
        .filter((candidate) => candidate.id !== snapshot.id)
        .map((candidate) => [candidate.id, candidate]),
    ).values(),
  ).slice(0, 5);

  return {
    snapshot,
    alternatives,
    region: getRegionForBucket(snapshot.bucketId),
  };
}
