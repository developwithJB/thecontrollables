import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2, Eye, Lock } from "lucide-react";
import { useCertificate } from "@/hooks/useCertificate";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEntitlements } from "@/hooks/useEntitlements";
import { isFeatureLocked } from "@/lib/entitlements";
import { getPricing } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";

interface Day7CompleteProps {
  displayName: string;
  startDate: string;
  endDate: string;
  resetSessionId: string;
}

export const Day7Complete = ({
  displayName,
  startDate,
  endDate,
  resetSessionId,
}: Day7CompleteProps) => {
  const navigate = useNavigate();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const {
    certificate,
    isLoading,
    isGenerating,
    isDownloading,
    downloadCertificate,
    shareCertificate,
  } = useCertificate(resetSessionId);
  const { isPaid } = useEntitlements(userId);
  const isLocked = isFeatureLocked("certificateDownload", isPaid);
  const pricing = getPricing();

  // Get user ID on mount
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  });

  // Format dates nicely
  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleShare = () => {
    shareCertificate(displayName, startDate, endDate);
  };

  const isWorking = isLoading || isGenerating || isDownloading;

  return (
    <>
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

          {/* Certificate Preview Thumbnail */}
          {certificate?.certificate_url && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mb-6"
            >
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="group relative w-full rounded-xl overflow-hidden border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-primary/30"
              >
                <img 
                  src={certificate.certificate_url} 
                  alt="Your completion certificate" 
                  className="w-full h-auto transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                  <span className="flex items-center gap-2 text-white text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                    <Eye className="w-4 h-4" />
                    Preview Certificate
                  </span>
                </div>
              </button>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3 mb-8"
          >
            {isLocked ? (
              <>
                <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Lock className="w-4 h-4" />
                    <span className="text-sm font-medium">Certificate Download</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Unlock certificate downloads and your full experience history.
                  </p>
                  <Button
                    onClick={() => navigate("/dashboard?upgrade=true")}
                    className="w-full h-10"
                    size="sm"
                  >
                    Unlock for ${pricing.amount}
                  </Button>
                </div>
                <Button
                  onClick={handleShare}
                  className="w-full h-12"
                  variant="ghost"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Your Achievement
                </Button>
              </>
            ) : (
              <>
                {certificate?.certificate_url && (
                  <Button
                    onClick={() => setIsPreviewOpen(true)}
                    className="w-full h-12"
                    variant="default"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Certificate
                  </Button>
                )}

                <Button
                  onClick={downloadCertificate}
                  disabled={isWorking}
                  className="w-full h-12"
                  variant="outline"
                >
                  {isWorking ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {isGenerating ? "Generating..." : isDownloading ? "Downloading..." : "Download Certificate"}
                </Button>

                <Button
                  onClick={handleShare}
                  className="w-full h-12"
                  variant="ghost"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </>
            )}
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

      {/* Certificate Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50">
          <DialogHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">Your Certificate</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="p-4 pt-2">
            {/* Certificate Image */}
            {certificate?.certificate_url && (
              <div className="rounded-xl overflow-hidden border border-border/30 shadow-2xl">
                <img 
                  src={certificate.certificate_url} 
                  alt="Your completion certificate" 
                  className="w-full h-auto"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button
                onClick={downloadCertificate}
                disabled={isWorking}
                className="flex-1 h-12"
              >
                {isWorking ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {isGenerating ? "Generating..." : isDownloading ? "Downloading..." : "Download"}
              </Button>

              <Button
                onClick={handleShare}
                variant="outline"
                className="flex-1 h-12"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
