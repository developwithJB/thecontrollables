import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import type { RingKey } from "@/hooks/useDailyRings";

export interface IGProofAnalysis {
  primary_ring: RingKey;
  secondary_ring?: RingKey | "none";
  tags: string[];
  interpretation: string;
}

export interface IGProofEntry {
  id: string;
  ring_key: string;
  source_type: string;
  caption_text: string | null;
  image_url: string | null;
  ai_interpretation: string | null;
  tags: string[];
  attached_to_ring: boolean;
  created_at: string;
}

const IG_PROOF_BUCKET = "ig-proof-images";
const LEGACY_PUBLIC_PATH_MARKER = `/storage/v1/object/public/${IG_PROOF_BUCKET}/`;

export const getOwnedIGProofStoragePath = (value: string, userId: string): string | null => {
  let storagePath = value;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const pathname = new URL(value).pathname;
      const markerIndex = pathname.indexOf(LEGACY_PUBLIC_PATH_MARKER);
      if (markerIndex === -1) return null;
      storagePath = decodeURIComponent(pathname.slice(markerIndex + LEGACY_PUBLIC_PATH_MARKER.length));
    } catch {
      return null;
    }
  }

  if (!storagePath.startsWith(`${userId}/`) || storagePath.includes("..") || storagePath.startsWith("/")) {
    return null;
  }

  return storagePath;
};

const createPrivateIGProofUrl = async (value: string, userId: string): Promise<string | null> => {
  const storagePath = getOwnedIGProofStoragePath(value, userId);
  if (!storagePath) return null;

  const { data, error } = await supabase.storage
    .from(IG_PROOF_BUCKET)
    .createSignedUrl(storagePath, 10 * 60);

  return error ? null : data.signedUrl;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
};

export function useIGProof(userId?: string) {
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<IGProofAnalysis | null>(null);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<IGProofEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  const analyzeCaption = useCallback(async (caption: string) => {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      if (isDevMockAuthEnabled()) {
        const result: IGProofAnalysis = {
          primary_ring: "prove",
          secondary_ring: "none",
          tags: ["dev-qa", "proof"],
          interpretation: caption.trim() || "Proof saved.",
        };
        setAnalysis(result);
        return result;
      }

      const { data, error } = await supabase.functions.invoke("ig-proof-analyze", {
        body: { caption },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data as IGProofAnalysis);
      return data as IGProofAnalysis;
    } catch (err: unknown) {
      console.error("IG Proof analysis failed:", err);
      toast({ title: "Analysis failed", description: getErrorMessage(err, "Could not analyze content."), variant: "destructive" });
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, [toast]);

  const analyzeScreenshot = useCallback(async (file: File) => {
    if (!userId) return null;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      // Upload to storage
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(IG_PROOF_BUCKET)
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      // For MVP, ask user for a caption/description since we can't OCR client-side
      // Persist only the owner-scoped object path. A short-lived preview URL is
      // created when history is loaded, so screenshots never need public URLs.
      return { imageUrl: path, storagePath: path };
    } catch (err: unknown) {
      console.error("Screenshot upload failed:", err);
      toast({ title: "Upload failed", description: getErrorMessage(err, "Could not upload screenshot."), variant: "destructive" });
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, [userId, toast]);

  const saveEntry = useCallback(async (params: {
    ringKey: RingKey;
    sourceType: "screenshot" | "caption";
    captionText?: string;
    imageUrl?: string;
    interpretation?: string;
    tags?: string[];
    attachToRing: boolean;
  }) => {
    if (!userId) return null;
    setSaving(true);
    try {
      if (isDevMockAuthEnabled()) {
        const entry = {
          id: crypto.randomUUID(),
          ring_key: params.ringKey,
          source_type: params.sourceType,
          caption_text: params.captionText || null,
          image_url: params.imageUrl || null,
          ai_interpretation: params.interpretation || null,
          tags: params.tags || [],
          attached_to_ring: params.attachToRing,
          created_at: new Date().toISOString(),
        };
        setEntries((current) => [entry, ...current]);
        toast({ title: params.attachToRing ? "Evidence charged" : "Evidence saved", description: "Dev QA evidence saved locally." });
        return { id: entry.id };
      }

      const { data, error } = await supabase
        .from("ig_proof_entries")
        .insert({
          user_id: userId,
          ring_key: params.ringKey,
          source_type: params.sourceType,
          caption_text: params.captionText || null,
          image_url: params.imageUrl || null,
          ai_interpretation: params.interpretation || null,
          tags: params.tags || [],
          attached_to_ring: params.attachToRing,
        })
        .select("id")
        .single();

      if (error) throw error;
      toast({ title: params.attachToRing ? "Ring filled from evidence" : "Evidence saved", description: params.attachToRing ? `Your ${params.ringKey} ring is complete.` : "Saved to your evidence journal." });
      return data;
    } catch (err: unknown) {
      console.error("Save IG proof failed:", err);
      toast({ title: "Save failed", description: getErrorMessage(err, "Could not save entry."), variant: "destructive" });
      return null;
    } finally {
      setSaving(false);
    }
  }, [userId, toast]);

  const loadEntries = useCallback(async (ringFilter?: RingKey) => {
    if (!userId) return;
    setLoadingEntries(true);
    try {
      if (isDevMockAuthEnabled()) {
        setEntries((current) => ringFilter ? current.filter((entry) => entry.ring_key === ringFilter) : current);
        return;
      }

      let query = supabase
        .from("ig_proof_entries")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (ringFilter) {
        query = query.eq("ring_key", ringFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      const storedEntries = (data || []) as unknown as IGProofEntry[];
      const entriesWithPrivatePreviews = await Promise.all(
        storedEntries.map(async (entry) => ({
          ...entry,
          image_url: entry.image_url
            ? await createPrivateIGProofUrl(entry.image_url, userId)
            : null,
        })),
      );
      setEntries(entriesWithPrivatePreviews);
    } catch (err) {
      console.error("Failed to load IG proof entries:", err);
    } finally {
      setLoadingEntries(false);
    }
  }, [userId]);

  const clearAnalysis = useCallback(() => setAnalysis(null), []);

  return {
    analyzing,
    analysis,
    saving,
    entries,
    loadingEntries,
    analyzeCaption,
    analyzeScreenshot,
    saveEntry,
    loadEntries,
    clearAnalysis,
  };
}
