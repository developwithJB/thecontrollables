import type { ControllableType } from "@/components/ControllableCard";
import { BOOK_CONTROLLABLES, getBookControllable } from "@/lib/bookWorld";

export type DexProofVisibility = "private" | "anonymous" | "public";

export interface DexShareSafePayload {
  title: string;
  body: string;
  footer: string;
  targetControllable: ControllableType;
  exactLocationStored: false;
  captionIncluded: boolean;
  caption?: string;
  city?: string;
  state?: string;
}

export interface DexProofEntry {
  id: string;
  userId: string;
  missionId: string;
  targetControllable: ControllableType;
  imageUrl: string;
  capturedAt: string;
  city: string;
  state: string;
  exactLocationStored: false;
  caption: string;
  visibility: DexProofVisibility;
  shareSafePayload: DexShareSafePayload;
}

export interface ChargeStage {
  id: "undiscovered" | "first_spark" | "charging" | "anchored" | "identity_proof";
  label: string;
  minProofCount: number;
  nextProofTarget: number | null;
  progress: number;
}

export interface DexCategorySummary {
  controllable: ControllableType;
  name: string;
  emoji: string;
  proofCount: number;
  chargeStage: ChargeStage;
  recentProof: DexProofEntry | null;
  emptyTitle: string;
  emptyDescription: string;
}

export interface DexStats {
  totalProofCount: number;
  missionProofCount: number;
  countsByControllable: Record<ControllableType, number>;
  categories: DexCategorySummary[];
}

export interface CreateDexProofEntryInput {
  id?: string;
  userId?: string | null;
  missionId: string;
  targetControllable: ControllableType;
  imageUrl: string;
  capturedAt?: string | Date;
  city?: string;
  state?: string;
  caption?: string;
  visibility?: DexProofVisibility;
  showCityOnShareCards?: boolean;
  includeCaptionInShare?: boolean;
}

export interface StartingChargePhotoScanPlaceholder {
  status: "future";
  source: "selected_photos";
  backgroundScan: false;
  sensitiveInference: false;
}

export interface ChargeSpotPlaceholder {
  status: "future";
  scope: "city_state_or_user_named_place";
  exactLocationStoredByDefault: false;
}

export interface PhotoPatternLocalMissionPlaceholder {
  status: "future";
  source: "user_approved_photo_patterns";
  requiresExplicitConsent: true;
}

export interface PhotosIntegrationPlaceholder {
  status: "future";
  accessPattern: "user_selected_assets_only_first";
  fullLibraryAccess: false;
}

export const DEX_FUTURE_PLACEHOLDERS = {
  startingChargePhotoScan: {
    status: "future",
    source: "selected_photos",
    backgroundScan: false,
    sensitiveInference: false,
  },
  chargeSpots: {
    status: "future",
    scope: "city_state_or_user_named_place",
    exactLocationStoredByDefault: false,
  },
  photoPatternLocalMissions: {
    status: "future",
    source: "user_approved_photo_patterns",
    requiresExplicitConsent: true,
  },
  photosIntegration: {
    status: "future",
    accessPattern: "user_selected_assets_only_first",
    fullLibraryAccess: false,
  },
} satisfies {
  startingChargePhotoScan: StartingChargePhotoScanPlaceholder;
  chargeSpots: ChargeSpotPlaceholder;
  photoPatternLocalMissions: PhotoPatternLocalMissionPlaceholder;
  photosIntegration: PhotosIntegrationPlaceholder;
};

const CHARGE_STAGES: ChargeStage[] = [
  { id: "undiscovered", label: "Undiscovered", minProofCount: 0, nextProofTarget: 1, progress: 0 },
  { id: "first_spark", label: "First Spark", minProofCount: 1, nextProofTarget: 3, progress: 25 },
  { id: "charging", label: "Charging", minProofCount: 3, nextProofTarget: 7, progress: 55 },
  { id: "anchored", label: "Anchored", minProofCount: 7, nextProofTarget: 12, progress: 80 },
  { id: "identity_proof", label: "Identity Proof", minProofCount: 12, nextProofTarget: null, progress: 100 },
];

export function getControllablesDexStorageKey(userId: string | null | undefined): string {
  return `controllables_dex_${userId || "guest"}`;
}

export function createDexProofEntry(input: CreateDexProofEntryInput): DexProofEntry {
  const capturedAt = normalizeCapturedAt(input.capturedAt);
  const targetControllable = isControllableType(input.targetControllable) ? input.targetControllable : "awareness";
  const city = trimSafe(input.city, 60);
  const state = trimSafe(input.state, 40);
  const caption = trimSafe(input.caption, 120);
  const visibility = isDexProofVisibility(input.visibility) ? input.visibility : "private";
  const entryWithoutSharePayload = {
    id: input.id || createDexId(targetControllable, capturedAt),
    userId: input.userId || "local",
    missionId: trimSafe(input.missionId, 120) || "manual-proof",
    targetControllable,
    imageUrl: input.imageUrl,
    capturedAt,
    city,
    state,
    exactLocationStored: false as const,
    caption,
    visibility,
  };

  return {
    ...entryWithoutSharePayload,
    shareSafePayload: buildDexShareSafePayload(entryWithoutSharePayload, {
      showCityOnShareCards: input.showCityOnShareCards === true,
      includeCaptionInShare: input.includeCaptionInShare === true,
    }),
  };
}

export function buildDexShareSafePayload(
  entry: Omit<DexProofEntry, "shareSafePayload">,
  options: {
    showCityOnShareCards?: boolean;
    includeCaptionInShare?: boolean;
  } = {},
): DexShareSafePayload {
  const guide = getBookControllable(entry.targetControllable);
  const canShowPlace =
    entry.visibility === "public" &&
    options.showCityOnShareCards === true &&
    Boolean(entry.city || entry.state);
  const place = entry.city || entry.state;
  const caption = entry.caption.trim();
  const captionIncluded = options.includeCaptionInShare === true && caption.length > 0;

  return {
    title: "Mission Complete.",
    body: canShowPlace && place ? `I charged ${guide.name} in ${place} today.` : `I charged ${guide.name} today.`,
    footer: "Control the Controllables one day at a time.",
    targetControllable: entry.targetControllable,
    exactLocationStored: false,
    captionIncluded,
    ...(captionIncluded ? { caption } : {}),
    ...(canShowPlace && entry.city ? { city: entry.city } : {}),
    ...(canShowPlace && entry.state ? { state: entry.state } : {}),
  };
}

export function getDexShareText(entry: DexProofEntry): string {
  const payload = entry.shareSafePayload;
  return [payload.title, payload.body, payload.footer, payload.captionIncluded ? payload.caption : null]
    .filter(Boolean)
    .join("\n");
}

export function getDexStats(entries: DexProofEntry[]): DexStats {
  const categories = getDexCategorySummaries(entries);
  return {
    totalProofCount: entries.length,
    missionProofCount: entries.filter((entry) => Boolean(entry.missionId)).length,
    countsByControllable: categories.reduce(
      (counts, category) => ({
        ...counts,
        [category.controllable]: category.proofCount,
      }),
      createEmptyControllableCounts(),
    ),
    categories,
  };
}

export function getDexCategorySummaries(entries: DexProofEntry[]): DexCategorySummary[] {
  const sortedEntries = getRecentDexProof(entries, entries.length);
  return BOOK_CONTROLLABLES.map((controllable) => {
    const proofEntries = sortedEntries.filter((entry) => entry.targetControllable === controllable.id);
    return {
      controllable: controllable.id,
      name: controllable.name,
      emoji: controllable.emoji,
      proofCount: proofEntries.length,
      chargeStage: getChargeStage(proofEntries.length),
      recentProof: proofEntries[0] ?? null,
      emptyTitle: `No ${controllable.name} proof yet`,
      emptyDescription: `Complete ${getIndefiniteArticle(controllable.name)} ${controllable.name} mission to add your first proof.`,
    };
  });
}

export function getRecentDexProof(entries: DexProofEntry[], limit = 6): DexProofEntry[] {
  return [...entries]
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
    .slice(0, Math.max(0, limit));
}

export function getChargeStage(proofCount: number): ChargeStage {
  return [...CHARGE_STAGES].reverse().find((stage) => proofCount >= stage.minProofCount) ?? CHARGE_STAGES[0];
}

export function deleteDexProofEntry(entries: DexProofEntry[], proofEntryId: string): DexProofEntry[] {
  return entries.filter((entry) => entry.id !== proofEntryId);
}

export function normalizeDexProofEntries(value: unknown): DexProofEntry[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeDexProofEntry).filter((entry): entry is DexProofEntry => Boolean(entry));
}

function normalizeDexProofEntry(value: unknown): DexProofEntry | null {
  if (!value || typeof value !== "object") return null;

  const source = value as Partial<DexProofEntry>;
  if (!source.missionId || !source.imageUrl || !isControllableType(source.targetControllable)) return null;

  return createDexProofEntry({
    id: typeof source.id === "string" ? source.id : undefined,
    userId: typeof source.userId === "string" ? source.userId : undefined,
    missionId: source.missionId,
    targetControllable: source.targetControllable,
    imageUrl: source.imageUrl,
    capturedAt: source.capturedAt,
    city: source.city,
    state: source.state,
    caption: source.caption,
    visibility: source.visibility,
    showCityOnShareCards: Boolean(source.shareSafePayload?.city || source.shareSafePayload?.state),
    includeCaptionInShare: source.shareSafePayload?.captionIncluded === true,
  });
}

function createEmptyControllableCounts(): Record<ControllableType, number> {
  return BOOK_CONTROLLABLES.reduce(
    (counts, controllable) => ({
      ...counts,
      [controllable.id]: 0,
    }),
    {} as Record<ControllableType, number>,
  );
}

function normalizeCapturedAt(value: string | Date | undefined): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "string" && !Number.isNaN(new Date(value).getTime())) return new Date(value).toISOString();
  return new Date().toISOString();
}

function isControllableType(value: unknown): value is ControllableType {
  return typeof value === "string" && BOOK_CONTROLLABLES.some((controllable) => controllable.id === value);
}

function isDexProofVisibility(value: unknown): value is DexProofVisibility {
  return value === "private" || value === "anonymous" || value === "public";
}

function trimSafe(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function getIndefiniteArticle(value: string): "a" | "an" {
  return /^[aeiou]/i.test(value) ? "an" : "a";
}

function createDexId(controllable: ControllableType, capturedAt: string): string {
  const stamp = capturedAt.replace(/[^0-9]/g, "").slice(0, 14);
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `dex-${stamp}-${controllable}-${randomPart}`;
}
