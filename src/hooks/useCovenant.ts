import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import {
  COVENANT_DURATION_DAYS,
  COVENANT_PROMISE_KEYS,
  calculateCovenantEvidence,
  createEmptyCovenantCheckin,
  getCovenantDayProgress,
  getTodayDateKey,
  isCovenantDayComplete,
  normalizeCovenantRules,
  type CovenantChallengeRecord,
  type CovenantDailyCheckinRecord,
  type CovenantEvidenceSummary,
  type CovenantPromiseKey,
  type GraceEvidenceCategory,
  type GraceEvidenceRecord,
} from "@/lib/covenant";

const COVENANT_STORAGE_PREFIX = "covenant_challenge_v1";

type CheckinUpdate = Partial<
  Pick<
    CovenantDailyCheckinRecord,
    | "jesus_first"
    | "bible_read"
    | "alcohol_free"
    | "workout_count"
    | "miles"
    | "nutrition_kept"
    | "water_goal"
    | "service_count"
    | "people_encouraged"
    | "journal_entry"
    | "scripture_memorized_count"
    | "reflection"
  >
>;

interface CovenantState {
  activeChallenge: CovenantChallengeRecord | null;
  checkins: CovenantDailyCheckinRecord[];
  todayCheckin: CovenantDailyCheckinRecord | null;
  graceEntries: GraceEvidenceRecord[];
  evidence: CovenantEvidenceSummary;
}

interface StartChallengeInput {
  title: string;
  mission?: string;
  rules?: CovenantPromiseKey[];
  startedOn?: string;
}

interface AddGraceEvidenceInput {
  category: GraceEvidenceCategory;
  title: string;
  story?: string;
  scriptureReference?: string;
  occurredOn?: string;
}

interface DevCovenantState {
  challenges: CovenantChallengeRecord[];
  checkins: CovenantDailyCheckinRecord[];
  graceEntries: GraceEvidenceRecord[];
  keptIntegrityPromises: number;
}

const emptyEvidence = calculateCovenantEvidence([]);

const getStorageKey = (userId: string): string => `${COVENANT_STORAGE_PREFIX}_${userId}`;

const readDevState = (userId: string): DevCovenantState => {
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (raw) return JSON.parse(raw) as DevCovenantState;
  } catch {
    // Local QA data is optional.
  }

  return { challenges: [], checkins: [], graceEntries: [], keptIntegrityPromises: 0 };
};

const writeDevState = (userId: string, state: DevCovenantState): void => {
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
  } catch {
    // Local QA data is optional.
  }
};

const addDays = (dateKey: string, days: number): string => {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const normalizeChallenge = (
  row: Omit<CovenantChallengeRecord, "rules" | "status"> & { rules: unknown; status: string },
): CovenantChallengeRecord => ({
  ...row,
  rules: normalizeCovenantRules(row.rules),
  status: ["active", "completed", "paused", "ended"].includes(row.status)
    ? (row.status as CovenantChallengeRecord["status"])
    : "ended",
});

const normalizeGraceEntry = (
  row: Omit<GraceEvidenceRecord, "category"> & { category: string },
): GraceEvidenceRecord => ({
  ...row,
  category: row.category as GraceEvidenceCategory,
});

export function useCovenant(userId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const devMock = isDevMockAuthEnabled();
  const today = getTodayDateKey();
  const queryKey = ["covenant-state", userId, today] as const;

  const stateQuery = useQuery({
    queryKey,
    queryFn: async (): Promise<CovenantState> => {
      if (!userId) {
        return {
          activeChallenge: null,
          checkins: [],
          todayCheckin: null,
          graceEntries: [],
          evidence: emptyEvidence,
        };
      }

      if (devMock) {
        const stored = readDevState(userId);
        const activeChallenge = stored.challenges.find((challenge) => challenge.status === "active") ?? null;
        const todayCheckin = activeChallenge
          ? stored.checkins.find(
              (entry) => entry.challenge_id === activeChallenge.id && entry.checkin_date === today,
            ) ?? null
          : null;

        return {
          activeChallenge,
          checkins: stored.checkins,
          todayCheckin,
          graceEntries: stored.graceEntries,
          evidence: calculateCovenantEvidence(stored.checkins, stored.keptIntegrityPromises, today),
        };
      }

      const [challengeResult, checkinsResult, graceResult, integrityResult] = await Promise.all([
        supabase
          .from("covenant_challenges")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .order("started_on", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("covenant_daily_checkins")
          .select("*")
          .eq("user_id", userId)
          .order("checkin_date", { ascending: true }),
        supabase
          .from("grace_evidence_entries")
          .select("*")
          .eq("user_id", userId)
          .order("occurred_on", { ascending: false }),
        supabase
          .from("integrity_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("kept", true),
      ]);

      if (challengeResult.error) throw challengeResult.error;
      if (checkinsResult.error) throw checkinsResult.error;
      if (graceResult.error) throw graceResult.error;
      if (integrityResult.error) throw integrityResult.error;

      const activeChallenge = challengeResult.data
        ? normalizeChallenge(challengeResult.data)
        : null;
      const checkins = (checkinsResult.data ?? []) as CovenantDailyCheckinRecord[];
      const graceEntries = (graceResult.data ?? []).map(normalizeGraceEntry);
      const todayCheckin = activeChallenge
        ? checkins.find(
            (entry) => entry.challenge_id === activeChallenge.id && entry.checkin_date === today,
          ) ?? null
        : null;

      return {
        activeChallenge,
        checkins,
        todayCheckin,
        graceEntries,
        evidence: calculateCovenantEvidence(checkins, integrityResult.count ?? 0, today),
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const startChallenge = useMutation({
    mutationFn: async (input: StartChallengeInput): Promise<CovenantChallengeRecord> => {
      if (!userId) throw new Error("Sign in to begin your covenant.");
      if (stateQuery.data?.activeChallenge) throw new Error("You already have an active covenant.");

      const startedOn = input.startedOn ?? today;
      const rules = normalizeCovenantRules(input.rules ?? COVENANT_PROMISE_KEYS);
      const now = new Date().toISOString();
      const record: CovenantChallengeRecord = {
        id: crypto.randomUUID(),
        user_id: userId,
        title: input.title.trim() || "75-Day Covenant",
        mission: input.mission?.trim() || null,
        duration_days: COVENANT_DURATION_DAYS,
        started_on: startedOn,
        ends_on: addDays(startedOn, COVENANT_DURATION_DAYS - 1),
        status: "active",
        rules,
        completed_at: null,
        created_at: now,
        updated_at: now,
      };

      if (devMock) {
        const stored = readDevState(userId);
        stored.challenges.push(record);
        writeDevState(userId, stored);
        return record;
      }

      const { data, error } = await supabase
        .from("covenant_challenges")
        .insert({
          user_id: record.user_id,
          title: record.title,
          mission: record.mission,
          duration_days: record.duration_days,
          started_on: record.started_on,
          ends_on: record.ends_on,
          status: record.status,
          rules: record.rules,
        })
        .select("*")
        .single();

      if (error) throw error;
      return normalizeChallenge(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["covenant-state", userId] });
      toast({
        title: "Covenant started",
        description: "Seventy-five days. One honest day at a time.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Could not start covenant", description: error.message, variant: "destructive" });
    },
  });

  const saveToday = useMutation({
    mutationFn: async (updates: CheckinUpdate): Promise<CovenantDailyCheckinRecord> => {
      if (!userId) throw new Error("Sign in to keep today's covenant.");
      const challenge = stateQuery.data?.activeChallenge;
      if (!challenge) throw new Error("Start a covenant first.");

      const base = stateQuery.data?.todayCheckin ?? createEmptyCovenantCheckin(challenge.id, userId, today);
      const next: CovenantDailyCheckinRecord = {
        ...base,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      next.day_complete = isCovenantDayComplete(next, challenge.rules);
      next.completed_at = next.day_complete ? next.completed_at ?? new Date().toISOString() : null;

      if (devMock) {
        const stored = readDevState(userId);
        const existingIndex = stored.checkins.findIndex(
          (entry) => entry.challenge_id === challenge.id && entry.checkin_date === today,
        );
        const storedRecord = { ...next, id: next.id || crypto.randomUUID() };
        if (existingIndex >= 0) stored.checkins[existingIndex] = storedRecord;
        else stored.checkins.push(storedRecord);

        const progress = getCovenantDayProgress(challenge, today);
        if (next.day_complete && progress.dayNumber >= challenge.duration_days) {
          const challengeIndex = stored.challenges.findIndex((entry) => entry.id === challenge.id);
          stored.challenges[challengeIndex] = {
            ...challenge,
            status: "completed",
            completed_at: new Date().toISOString(),
          };
        }

        writeDevState(userId, stored);
        return storedRecord;
      }

      const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...payload } = next;
      const { data, error } = await supabase
        .from("covenant_daily_checkins")
        .upsert(payload, { onConflict: "challenge_id,checkin_date" })
        .select("*")
        .single();

      if (error) throw error;

      const progress = getCovenantDayProgress(challenge, today);
      if (next.day_complete && progress.dayNumber >= challenge.duration_days) {
        await supabase
          .from("covenant_challenges")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", challenge.id);
      }

      return data as CovenantDailyCheckinRecord;
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ["covenant-state", userId] });
      toast({
        title: entry.day_complete ? "Today's covenant is kept" : "Evidence saved",
        description: entry.day_complete
          ? "This day is now part of the evidence you carry forward."
          : "Keep returning to what remains.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save evidence", description: error.message, variant: "destructive" });
    },
  });

  const addGraceEvidence = useMutation({
    mutationFn: async (input: AddGraceEvidenceInput): Promise<GraceEvidenceRecord> => {
      if (!userId) throw new Error("Sign in to record grace.");
      const now = new Date().toISOString();
      const record: GraceEvidenceRecord = {
        id: crypto.randomUUID(),
        user_id: userId,
        challenge_id: stateQuery.data?.activeChallenge?.id ?? null,
        category: input.category,
        title: input.title.trim(),
        story: input.story?.trim() || null,
        scripture_reference: input.scriptureReference?.trim() || null,
        occurred_on: input.occurredOn ?? today,
        is_favorite: false,
        created_at: now,
        updated_at: now,
      };

      if (!record.title) throw new Error("Give this evidence a short title.");

      if (devMock) {
        const stored = readDevState(userId);
        stored.graceEntries.unshift(record);
        writeDevState(userId, stored);
        return record;
      }

      const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...payload } = record;
      const { data, error } = await supabase
        .from("grace_evidence_entries")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;
      return normalizeGraceEntry(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["covenant-state", userId] });
      toast({ title: "Grace remembered", description: "This is now part of your testimony." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save this moment", description: error.message, variant: "destructive" });
    },
  });

  return {
    activeChallenge: stateQuery.data?.activeChallenge ?? null,
    checkins: stateQuery.data?.checkins ?? [],
    todayCheckin: stateQuery.data?.todayCheckin ?? null,
    graceEntries: stateQuery.data?.graceEntries ?? [],
    evidence: stateQuery.data?.evidence ?? emptyEvidence,
    isLoading: stateQuery.isLoading,
    error: stateQuery.error,
    startChallenge: startChallenge.mutateAsync,
    isStartingChallenge: startChallenge.isPending,
    saveToday: saveToday.mutateAsync,
    isSavingToday: saveToday.isPending,
    addGraceEvidence: addGraceEvidence.mutateAsync,
    isAddingGraceEvidence: addGraceEvidence.isPending,
  };
}
