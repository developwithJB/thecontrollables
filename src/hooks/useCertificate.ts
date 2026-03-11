import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Certificate {
  id: string;
  user_id: string;
  reset_session_id: string | null;
  season_id: string | null;
  certificate_type: string | null;
  display_name: string;
  start_date: string;
  end_date: string;
  certificate_url: string | null;
  reflection_text: string | null;
  created_at: string;
}

// ─── Snapshot Certificate (original) ──────────────────────────────────────────

export const useCertificate = (resetSessionId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: certificate, isLoading } = useQuery({
    queryKey: ["certificate", resetSessionId],
    queryFn: async () => {
      if (!resetSessionId) return null;
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("reset_session_id", resetSessionId)
        .maybeSingle();
      if (error) throw error;
      return data as Certificate | null;
    },
    enabled: !!resetSessionId,
  });

  const generateMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!resetSessionId) throw new Error("No reset session ID");
      const { data, error } = await supabase.functions.invoke("generate-certificate", {
        body: { reset_session_id: resetSessionId },
      });
      if (error) throw new Error(error.message || "Failed to generate certificate");
      if (!data?.certificate_url) throw new Error("No certificate URL returned");
      return data.certificate_url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate", resetSessionId] });
    },
    onError: (error) => {
      toast({ title: "Error generating certificate", description: error.message, variant: "destructive" });
    },
  });

  const convertSvgToPng = async (svgUrl: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Could not get canvas context")); return; }
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to convert to PNG"));
        }, "image/png", 1.0);
      };
      img.onerror = () => reject(new Error("Failed to load certificate image"));
      img.src = svgUrl;
    });
  };

  const downloadCertificate = async () => {
    setIsDownloading(true);
    try {
      let url = certificate?.certificate_url;
      if (!url) url = await generateMutation.mutateAsync();
      if (!url) throw new Error("Could not get certificate URL");
      const pngBlob = await convertSvgToPng(url);
      const blobUrl = URL.createObjectURL(pngBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "controllables-certificate.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast({ title: "Certificate downloaded", description: "Your certificate has been saved." });
    } catch (error) {
      toast({ title: "Download failed", description: error instanceof Error ? error.message : "Could not download certificate", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const shareCertificate = async (displayName: string, startDate: string, endDate: string) => {
    const formatDate = (dateStr: string) => new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const shareText = `I committed to controlling what I could and surrendering what I could not from ${formatDate(startDate)} to ${formatDate(endDate)}. #TheDashboard`;
    if (navigator.share) {
      try { await navigator.share({ text: shareText }); } catch {}
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({ title: "Copied to clipboard", description: "Share text copied to your clipboard." });
    }
  };

  return {
    certificate,
    isLoading,
    isGenerating: generateMutation.isPending,
    isDownloading,
    generateCertificate: generateMutation.mutateAsync,
    downloadCertificate,
    shareCertificate,
  };
};

// ─── Season Certificate ───────────────────────────────────────────────────────

export const useSeasonCertificate = (seasonId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: certificate, isLoading } = useQuery({
    queryKey: ["season-certificate", seasonId],
    queryFn: async () => {
      if (!seasonId) return null;
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("season_id", seasonId)
        .eq("certificate_type", "season")
        .maybeSingle();
      if (error) throw error;
      return data as Certificate | null;
    },
    enabled: !!seasonId,
  });

  const generateMutation = useMutation({
    mutationFn: async (): Promise<{ certificate_url: string; reflection_text: string }> => {
      if (!seasonId) throw new Error("No season ID");
      const { data, error } = await supabase.functions.invoke("generate-certificate", {
        body: { season_id: seasonId, type: "season" },
      });
      if (error) throw new Error(error.message || "Failed to generate season certificate");
      return { certificate_url: data.certificate_url, reflection_text: data.reflection_text };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["season-certificate", seasonId] });
    },
    onError: (error) => {
      toast({ title: "Error generating season certificate", description: error.message, variant: "destructive" });
    },
  });

  return {
    certificate,
    isLoading,
    isGenerating: generateMutation.isPending,
    generateCertificate: generateMutation.mutateAsync,
  };
};
