import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type RingKey = "notice" | "choose" | "prove" | "charge" | "align";

export interface RingDefinition {
  key: RingKey;
  name: string;
  controllable: string;
  emoji: string;
  meaning: string;
  prompt: string;
  color: string;
}

export const RING_DEFINITIONS: RingDefinition[] = [
  {
    key: "notice",
    name: "Notice",
    controllable: "awareness",
    emoji: "🦉",
    meaning: "Scan your internal system — catch fear circuits before they take over.",
    prompt: "Run a Circuit Check",
    color: "awareness",
  },
  {
    key: "choose",
    name: "Choose",
    controllable: "perspective",
    emoji: "🐢",
    meaning: "Reframe the story. Move from fear to love.",
    prompt: "Open the Reframe Studio",
    color: "perspective",
  },
  {
    key: "prove",
    name: "Prove",
    controllable: "habit",
    emoji: "🦈",
    meaning: "One action that proves who you're becoming.",
    prompt: "Set your Proof Action",
    color: "habit",
  },
  {
    key: "charge",
    name: "Charge",
    controllable: "wellness",
    emoji: "🛰️",
    meaning: "Recharge your system with one physical win.",
    prompt: "Open the Recharge Engine",
    color: "wellness",
  },
  {
    key: "align",
    name: "Align",
    controllable: "environment",
    emoji: "🚀",
    meaning: "Shape your environment to support growth.",
    prompt: "Run an Environment Reset",
    color: "environment",
  },
];

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

const DEFAULT_STATE: DailyRingsState = {
  notice_completed: false, notice_response: null,
  choose_completed: false, choose_response: null,
  prove_completed: false, prove_response: null,
  charge_completed: false, charge_response: null,
  align_completed: false, align_response: null,
};

function getStatusLabel(count: number): string {
  if (count === 0) return "Just Getting Started";
  if (count <= 2) return "Building Momentum";
  if (count <= 4) return "Locked In";
  return "Fully Charged ⚡";
}

const today = () => new Date().toLocaleDateString("sv-SE");

export function useDailyRings(userId?: string) {
  const [rings, setRings] = useState<DailyRingsState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [rowId, setRowId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch or create today's row
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
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
        console.error("Failed to load daily rings:", error);
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
        // Create today's row
        const { data: newRow, error: insertErr } = await supabase
          .from("daily_rings")
          .insert({ user_id: userId, ring_date: dateStr })
          .select("id")
          .single();

        if (!cancelled && newRow) setRowId(newRow.id);
        if (insertErr) console.error("Failed to create daily rings:", insertErr);
      }
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const completedCount = useMemo(() => {
    let c = 0;
    if (rings.notice_completed) c++;
    if (rings.choose_completed) c++;
    if (rings.prove_completed) c++;
    if (rings.charge_completed) c++;
    if (rings.align_completed) c++;
    return c;
  }, [rings]);

  const statusLabel = useMemo(() => getStatusLabel(completedCount), [completedCount]);

  const completeRing = useCallback(async (key: RingKey, response?: string) => {
    if (!rowId) return;

    // Optimistic update
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

    const { error } = await supabase
      .from("daily_rings")
      .update(update)
      .eq("id", rowId);

    if (error) {
      console.error("Failed to complete ring:", error);
      // Revert
      setRings((prev) => ({
        ...prev,
        [`${key}_completed`]: false,
        [`${key}_response`]: null,
      }));
      toast({ title: "Error", description: "Could not save ring completion.", variant: "destructive" });
    }
  }, [rowId, toast]);

  const isCompleted = useCallback((key: RingKey) => {
    return rings[`${key}_completed`];
  }, [rings]);

  return {
    rings,
    loading,
    completedCount,
    statusLabel,
    completeRing,
    isCompleted,
    definitions: RING_DEFINITIONS,
    rowId,
  };
}
