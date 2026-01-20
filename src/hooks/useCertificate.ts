import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Certificate {
  id: string;
  user_id: string;
  reset_session_id: string;
  display_name: string;
  start_date: string;
  end_date: string;
  certificate_url: string | null;
  created_at: string;
}

export const useCertificate = (resetSessionId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch existing certificate for this reset session
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

  // Generate certificate via edge function
  const generateMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!resetSessionId) throw new Error("No reset session ID");

      console.log("Calling generate-certificate edge function...");

      const { data, error } = await supabase.functions.invoke("generate-certificate", {
        body: { reset_session_id: resetSessionId },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to generate certificate");
      }

      if (!data?.certificate_url) {
        throw new Error("No certificate URL returned");
      }

      console.log("Certificate generated:", data.certificate_url);
      return data.certificate_url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate", resetSessionId] });
    },
    onError: (error) => {
      toast({
        title: "Error generating certificate",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Convert SVG to PNG using canvas
  const convertSvgToPng = async (svgUrl: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        // Create canvas with high resolution
        const scale = 2; // 2x for retina quality
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        // Scale for high DPI
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to convert to PNG"));
          }
        }, "image/png", 1.0);
      };
      
      img.onerror = () => reject(new Error("Failed to load certificate image"));
      img.src = svgUrl;
    });
  };

  // Download certificate
  const downloadCertificate = async () => {
    setIsDownloading(true);

    try {
      let url = certificate?.certificate_url;

      // Generate if not exists
      if (!url) {
        url = await generateMutation.mutateAsync();
      }

      if (!url) {
        throw new Error("Could not get certificate URL");
      }

      // Convert SVG to PNG for download
      const pngBlob = await convertSvgToPng(url);
      
      // Create download link
      const blobUrl = URL.createObjectURL(pngBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "controllables-certificate.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast({
        title: "Certificate downloaded",
        description: "Your certificate has been saved.",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Could not download certificate",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Share certificate
  const shareCertificate = async (displayName: string, startDate: string, endDate: string) => {
    const formatDate = (dateStr: string) => {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    };

    const shareText = `I committed to controlling what I could and surrendering what I could not from ${formatDate(startDate)} to ${formatDate(endDate)}. #TheControllables`;

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied to clipboard",
        description: "Share text copied to your clipboard.",
      });
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
