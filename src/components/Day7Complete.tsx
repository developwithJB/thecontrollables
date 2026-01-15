import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Day7CompleteProps {
  displayName: string;
  startDate: string;
  endDate: string;
  onGenerateCertificate: () => Promise<string | null>;
  isGenerating: boolean;
  existingCertificateUrl?: string | null;
}

export const Day7Complete = ({
  displayName,
  startDate,
  endDate,
  onGenerateCertificate,
  isGenerating,
  existingCertificateUrl,
}: Day7CompleteProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [certificateUrl, setCertificateUrl] = useState<string | null>(
    existingCertificateUrl || null
  );

  // Format dates nicely
  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const downloadBlobToFile = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const assertPngBlob = async (blob: Blob) => {
    const header = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
    const pngSig = [137, 80, 78, 71, 13, 10, 26, 10];
    const isPng = pngSig.every((b, i) => header[i] === b);
    if (!isPng) throw new Error("Downloaded file is not a valid PNG");
  };

  const blobFromUrlPreferStorage = async (url: string): Promise<Blob> => {
    const marker = "/storage/v1/object/public/certificates/";
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const storagePath = decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
      const { data, error } = await supabase.storage.from("certificates").download(storagePath);
      if (!error && data) return data;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error("Certificate file not found");
    return await response.blob();
  };

  const handleDownloadCertificate = async () => {
    let urlToDownload = certificateUrl || existingCertificateUrl;

    if (!urlToDownload) {
      urlToDownload = await onGenerateCertificate();
      if (urlToDownload) setCertificateUrl(urlToDownload);
    }

    if (!urlToDownload) return;

    try {
      const blob = await blobFromUrlPreferStorage(urlToDownload);
      await assertPngBlob(blob);
      downloadBlobToFile(blob, `controllables-certificate-${endDate}.png`);
    } catch (err) {
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Could not download certificate",
        variant: "destructive",
      });
      // Fallback: open in new tab for inspection
      window.open(urlToDownload, "_blank");
    }
  };

  const shareText = `I committed to controlling what I could and surrendering what I could not from ${formatDate(startDate)} to ${formatDate(endDate)}.`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="max-w-sm w-full text-center">
        {/* Calm emoji */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="text-6xl mb-6"
        >
          ✨
        </motion.div>

        {/* Completion Message */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-semibold text-foreground mb-6"
        >
          You did it.
        </motion.h1>

        {/* Statement */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-muted/30 rounded-xl p-6 mb-8"
        >
          <p className="text-foreground leading-relaxed">
            I committed to controlling what I could and surrendering what I could not
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            {formatDate(startDate)} – {formatDate(endDate)}
          </p>
          {displayName && (
            <p className="text-foreground mt-4 font-medium">{displayName}</p>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3 mb-8"
        >
          <Button
            onClick={handleDownloadCertificate}
            disabled={isGenerating}
            className="w-full h-12"
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Download Certificate"}
          </Button>

          <Button
            onClick={handleShare}
            className="w-full h-12"
            variant="ghost"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </motion.div>

        {/* Book link - subtle, no pressure */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="border-t pt-6"
        >
          <p className="text-muted-foreground text-sm mb-3">
            Want to go deeper?
          </p>
          <a
            href="https://a.co/d/1DGPGEV"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm"
          >
            📖 The Controllables (Amazon)
          </a>
        </motion.div>

        {/* Return to Dashboard */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8"
        >
          <Button
            onClick={() => navigate("/dashboard")}
            variant="ghost"
            className="text-muted-foreground"
          >
            Return to Dashboard
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
