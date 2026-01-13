import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";

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

  const handleDownloadCertificate = async () => {
    let urlToDownload = certificateUrl || existingCertificateUrl;
    
    if (!urlToDownload) {
      // Generate and save certificate
      urlToDownload = await onGenerateCertificate();
      if (urlToDownload) {
        setCertificateUrl(urlToDownload);
      }
    }

    if (urlToDownload) {
      // For storage URLs, we need to fetch and create a blob for download
      try {
        const response = await fetch(urlToDownload);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = "controllables-certificate.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch {
        // Fallback: open in new tab
        window.open(urlToDownload, "_blank");
      }
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
