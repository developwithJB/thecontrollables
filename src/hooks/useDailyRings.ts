import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getControllableRosterProfile } from "@/lib/controllableRoster";
import { AWARENESS_MOVE_MEANING } from "@/lib/awarenessLanguage";
import type { ControllableType } from "@/components/ControllableCard";

export type RingKey = "notice" | "choose" | "prove" | "charge" | "align";
export type DailyMoveKey = RingKey;

export interface RingDefinition {
  key: RingKey;
  name: string;
  shortName: string;
  controllable: ControllableType;
  emoji: string;
  roleLabel: string;
  meaning: string;
  prompt: string;
  completionLabel: string;
  color: string;
}

export type DailyMoveDefinition = RingDefinition;

const awarenessProfile = getControllableRosterProfile("awareness");
const perspectiveProfile = getControllableRosterProfile("perspective");
const habitProfile = getControllableRosterProfile("habit");
const wellnessProfile = getControllableRosterProfile("wellness");
const environmentProfile = getControllableRosterProfile("environment");

export const DAILY_MOVE_DEFINITIONS: DailyMoveDefinition[] = [
  {
    key: "notice",
    name: "Awareness Move",
    shortName: "Awareness",
    controllable: "awareness",
    emoji: "🦉",
    roleLabel: awarenessProfile.roleLabel,
    meaning: AWARENESS_MOVE_MEANING,
    prompt: "Open the Awareness Move",
    completionLabel: "Complete Awareness Move",
    color: "awareness",
  },
  {
    key: "choose",
    name: "Perspective Move",
    shortName: "Perspective",
    controllable: "perspective",
    emoji: "🐢",
    roleLabel: perspectiveProfile.roleLabel,
    meaning: "Let your translator zoom out and turn the moment into something usable.",
    prompt: "Open the Perspective Move",
    completionLabel: "Complete Perspective Move",
    color: "perspective",
  },
  {
    key: "prove",
    name: "Habit Move",
    shortName: "Habit",
    controllable: "habit",
    emoji: "🦈",
    roleLabel: habitProfile.roleLabel,
    meaning: "Let your builder pick one rep that turns intention into action.",
    prompt: "Open the Habit Move",
    completionLabel: "Complete Habit Move",
    color: "habit",
  },
  {
    key: "align",
    name: "Environment Move",
    shortName: "Environment",
    controllable: "environment",
    emoji: "🚀",
    roleLabel: environmentProfile.roleLabel,
    meaning: "Let your protector shape the space around you so the next move has less friction.",
    prompt: "Open the Environment Move",
    completionLabel: "Complete Environment Move",
    color: "environment",
  },
  {
    key: "charge",
    name: "Wellness Move",
    shortName: "Wellness",
    controllable: "wellness",
    emoji: "🛰️",
    roleLabel: wellnessProfile.roleLabel,
    meaning: "Let your charger restore the energy the rest of the team depends on.",
    prompt: "Open the Wellness Move",
    completionLabel: "Complete Wellness Move",
    color: "wellness",
  },
];

export const RING_DEFINITIONS = DAILY_MOVE_DEFINITIONS;

export interface DailyRingsState {
  notice_completed: boolean;
  notice_response: string | null;
  choose_completed: boolean;
  choose_response: string | null;
  prove_completed: boolean;
  prove_response: string | null;
  charge_completed: boolean;
  charge_response: string | null;
  align_completed: boolean;
  align_response: string | null;
}

export type DailyMovesState = DailyRingsState;

const DEFAULT_STATE: DailyRingsState = {
  notice_completed: false,
  notice_response: null,
  choose_completed: false,
  choose_response: null,
  prove_completed: false,
  prove_response: null,
  charge_completed: false,
  charge_response: null,
  align_completed: false,
  align_response: null,
};

function getStatusLabel(count: number): string {
  if (count === 0) return "Choose your moves";
  if (count <= 2) return "Moves in motion";
  if (count <= 4) return "Team coming online";
  return "Fully Charged ⚡";
}

const today = () => new Date().toLocaleDateString("sv-SE");

export function useDailyRings(userId?: string) {
  const [rings, setRings] = useState<DailyRingsState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [rowId, setRowId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const dateStr = today();
      const { data, error } = await supabase
        .from("daily_rings")
        .select("*")
        .eq("user_id", userId)
        .eq("ring_date", dateStr)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Failed to load daily moves:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setRowId(data.id);
        setRings({
          notice_completed: data.notice_completed,
          notice_response: data.notice_response,
          choose_completed: data.choose_completed,
          choose_response: data.choose_response,
          prove_completed: data.prove_completed,
          prove_response: data.prove_response,
          charge_completed: data.charge_completed,
          charge_response: data.charge_response,
          align_completed: data.align_completed,
          align_response: data.align_response,
        });
      } else {
        const { data: newRow, error: insertErr } = await supabase
          .from("daily_rings")
          .insert({ user_id: userId, ring_date: dateStr })
          .select("id")
          .single();

        if (!cancelled && newRow) setRowId(newRow.id);
        if (insertErr) console.error("Failed to create daily moves:", insertErr);
      }

      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const completedCount = useMemo(() => {
    let count = 0;
    if (rings.notice_completed) count++;
    if (rings.choose_completed) count++;
    if (rings.prove_completed) count++;
    if (rings.charge_completed) count++;
    if (rings.align_completed) count++;
    return count;
  }, [rings]);

  const statusLabel = useMemo(() => getStatusLabel(completedCount), [completedCount]);

  const completeRing = useCallback(
    async (key: RingKey, response?: string) => {
      if (!rowId) return;

      setRings((prev) => ({
        ...prev,
        [`${key}_completed`]: true,
        [`${key}_response`]: response || null,
      }));

      const update: Record<string, unknown> = {
        [`${key}_completed`]: true,
        [`${key}_response`]: response || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("daily_rings").update(update).eq("id", rowId);

      if (error) {
        console.error("Failed to complete move:", error);
        setRings((prev) => ({
          ...prev,
          [`${key}_completed`]: false,
          [`${key}_response`]: null,
        }));
        toast({
          title: "Error",
          description: "Could not save move completion.",
          variant: "destructive",
        });
      }
    },
    [rowId, toast],
  );

  const isCompleted = useCallback(
    (key: RingKey) => {
      return rings[`${key}_completed`];
    },
    [rings],
  );

  return {
    rings,
    moves: rings,
    loading,
    completedCount,
    statusLabel,
    completeRing,
    completeMove: completeRing,
    isCompleted,
    isMoveCompleted: isCompleted,
    definitions: DAILY_MOVE_DEFINITIONS,
    moveDefinitions: DAILY_MOVE_DEFINITIONS,
    rowId,
  };
}

export const useDailyMoves = useDailyRings;
