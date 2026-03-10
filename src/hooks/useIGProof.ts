import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
      const { data, error } = await supabase.functions.invoke("ig-proof-analyze", {
        body: { caption },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data as IGProofAnalysis);
      return data as IGProofAnalysis;
    } catch (err: any) {
      console.error("IG Proof analysis failed:", err);
      toast({ title: "Analysis failed", description: err.message || "Could not analyze content.", variant: "destructive" });
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
        .from("ig-proof-images")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("ig-proof-images").getPublicUrl(path);

      // For MVP, ask user for a caption/description since we can't OCR client-side
      // We'll return the image URL for saving, but we need text for analysis
      return { imageUrl: urlData.publicUrl, storagePath: path };
    } catch (err: any) {
      console.error("Screenshot upload failed:", err);
      toast({ title: "Upload failed", description: err.message || "Could not upload screenshot.", variant: "destructive" });
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
      const { data, error } = await supabase
        .from("ig_proof_entries" as any)
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
      toast({ title: params.attachToRing ? "Ring filled from Instagram" : "Evidence saved", description: params.attachToRing ? `Your ${params.ringKey} ring is complete.` : "Saved to your proof history." });
      return data;
    } catch (err: any) {
      console.error("Save IG proof failed:", err);
      toast({ title: "Save failed", description: err.message || "Could not save entry.", variant: "destructive" });
      return null;
    } finally {
      setSaving(false);
    }
  }, [userId, toast]);

  const loadEntries = useCallback(async (ringFilter?: RingKey) => {
    if (!userId) return;
    setLoadingEntries(true);
    try {
      let query = supabase
        .from("ig_proof_entries" as any)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (ringFilter) {
        query = query.eq("ring_key", ringFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEntries((data || []) as unknown as IGProofEntry[]);
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
