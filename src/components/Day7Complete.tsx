import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2, Eye, Lock, ChevronRight, Sparkles, Coffee } from "lucide-react";
import { useCertificate } from "@/hooks/useCertificate";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEntitlements } from "@/hooks/useEntitlements";
import { isFeatureLocked } from "@/lib/entitlements";
import { getPricing, isLaunchPriceActive, getDaysUntilLaunchEnd } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { 
  getRecommendedNextFoundation, 
  getJourneyById,
  GUIDED_JOURNEYS 
} from "@/lib/guidedJourneys";

interface Day7CompleteProps {
  displayName: string;
  startDate: string;
  endDate: string;
  resetSessionId: string;
  completedJourneyId?: string;
}

export const Day7Complete = ({
  displayName,
  startDate,
  endDate,
  resetSessionId,
  completedJourneyId,
}: Day7CompleteProps) => {
  const navigate = useNavigate();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showWhatsNext, setShowWhatsNext] = useState(true);
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
  
  // Get build data for recommendations
  const { currentBuild, assessmentHistory } = useBuildAssessment();
  
  // Get recommended next Snapshot
  const recommendedJourney = getRecommendedNextFoundation(
    currentBuild,
    assessmentHistory,
    completedJourneyId
  );
  
  const completedJourney = completedJourneyId ? getJourneyById(completedJourneyId) : null;

  // Get user ID on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

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

  const handleStartNextSnapshot = (journeyId: string) => {
    // Navigate to dashboard with the journey selection
    navigate(`/dashboard?startSnapshot=${journeyId}`);
  };

  const handleChooseDifferent = () => {
    navigate("/dashboard?showJourneySwitcher=true");
  };

  const handleTakeBreak = () => {
    // Enable maintenance mode via query param
    navigate("/dashboard?maintenanceMode=true");
  };

  const isWorking = isLoading || isGenerating || isDownloading;
  const daysRemaining = getDaysUntilLaunchEnd();
  const showLaunchBadge = isLaunchPriceActive() && daysRemaining > 0;

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
            {completedJourney && (
              <p className="text-primary mt-2 text-sm">
                {completedJourney.emoji} {completedJourney.title}
              </p>
            )}
          </motion.div>

          {/* What's Next Section - NEW! */}
          {showWhatsNext && isPaid && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mb-8"
            >
              <div className="border border-primary/20 bg-primary/5 rounded-xl p-5">
                <div className="flex items-center gap-2 justify-center mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground">What's Next?</h3>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  Based on your Build, we recommend:
                </p>
                
                {/* Recommended Journey */}
                <button
                  onClick={() => handleStartNextSnapshot(recommendedJourney.id)}
                  className="w-full bg-background hover:bg-muted/50 border border-border rounded-lg p-4 text-left transition-colors group mb-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{recommendedJourney.emoji}</span>
                      <div>
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {recommendedJourney.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {recommendedJourney.tagline}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </button>
                
                {/* Alternative Options */}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleChooseDifferent}
                    className="flex-1 text-xs h-9"
                  >
                    Choose Different
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTakeBreak}
                    className="flex-1 text-xs h-9"
                  >
                    <Coffee className="w-3 h-3 mr-1" />
                    Take a Break
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* What's Next for Free Users - Show upgrade prompt */}
          {showWhatsNext && !isPaid && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mb-8"
            >
              <div className="border border-primary/20 bg-primary/5 rounded-xl p-5">
                <div className="flex items-center gap-2 justify-center mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Ready for More?</h3>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  You've completed your free 7-Day Snapshot. Unlock unlimited Snapshots and The Controllables to continue your journey.
                </p>
                
                <Button
                  onClick={() => navigate("/dashboard?upgrade=true")}
                  className="w-full h-10"
                >
                  Unlock Full Access - ${pricing.amount}
                </Button>
                
                {showLaunchBadge && (
                  <p className="text-xs text-primary mt-2">
                    🔥 Launch price ends in {daysRemaining} days
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Certificate Preview Thumbnail */}
          {certificate?.certificate_url && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
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
            transition={{ delay: 0.55 }}
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
                  {showLaunchBadge && (
                    <p className="text-xs text-primary mt-2">
                      🔥 {daysRemaining} days left at launch price
                    </p>
                  )}
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