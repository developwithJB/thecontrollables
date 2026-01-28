import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2, Eye, Lock, ChevronRight, Sparkles, Coffee } from "lucide-react";
import { useCertificate } from "@/hooks/useCertificate";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEntitlements } from "@/hooks/useEntitlements";
import { isFeatureLocked } from "@/lib/entitlements";
import { getPricing, type PlanType } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { PlanSelector } from "@/components/PlanSelector";
import { 
  getRecommendedNextSnapshot, 
  getJourneyById,
} from "@/lib/guidedJourneys";

interface Day7CompleteProps {
  displayName: string;
  startDate: string;
  endDate: string;
  resetSessionId: string;
  completedJourneyId?: string;
  isHistoricalView?: boolean;
}

export const Day7Complete = ({
  displayName,
  startDate,
  endDate,
  resetSessionId,
  completedJourneyId,
  isHistoricalView = false,
}: Day7CompleteProps) => {
  const navigate = useNavigate();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showWhatsNext, setShowWhatsNext] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | undefined>();
  const {
    certificate,
    isLoading,
    isGenerating,
    isDownloading,
    downloadCertificate,
    shareCertificate,
  } = useCertificate(resetSessionId);
  const { isPaid, initiateCheckout, isCheckingOut } = useEntitlements(userId);
  const isLocked = isFeatureLocked("certificateDownload", isPaid);
  const pricing = getPricing();
  
  // Get build data for recommendations
  const { currentBuild, assessmentHistory } = useBuildAssessment();
  
  // Get recommended next Snapshot
  const recommendedJourney = getRecommendedNextSnapshot(
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

  const handlePlanSelect = (plan: PlanType) => {
    setSelectedPlan(plan);
    initiateCheckout(plan);
  };

  const isWorking = isLoading || isGenerating || isDownloading;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      >
        {/* Subtle celebration particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                opacity: 0, 
                y: 100,
                x: Math.random() * 100 - 50,
              }}
              animate={{ 
                opacity: [0, 1, 0],
                y: -200,
                x: Math.random() * 200 - 100,
              }}
              transition={{ 
                duration: 3 + Math.random() * 2,
                delay: i * 0.3,
                repeat: Infinity,
                repeatDelay: 2,
              }}
              className="absolute bottom-0 text-2xl"
              style={{ left: `${10 + i * 7}%` }}
            >
              {['✨', '🌟', '⭐', '💫'][i % 4]}
            </motion.div>
          ))}
        </div>

        <div className="max-w-sm w-full text-center relative z-10">
          {/* Big celebration moment */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
            className="text-7xl mb-4"
          >
            🏆
          </motion.div>

          {/* Headline - impactful */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-foreground mb-2"
          >
            You Did It.
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-primary font-medium mb-6"
          >
            7 Days. 7 Check-ins. 100% You.
          </motion.p>

          {/* Proof Statement - meaningful */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-primary/20 via-primary/10 to-muted/30 rounded-2xl p-6 mb-6 border border-primary/20"
          >
            <p className="text-sm uppercase tracking-widest text-muted-foreground mb-3">
              Your Proof
            </p>
            <p className="text-lg text-foreground leading-relaxed font-medium">
              This is evidence that you showed up, every single day, for yourself.
            </p>
            <p className="text-muted-foreground mt-3 text-sm">
              {formatDate(startDate)} – {formatDate(endDate)}
            </p>
            {displayName && (
              <p className="text-foreground mt-4 font-semibold text-lg">{displayName}</p>
            )}
            {completedJourney && (
              <p className="text-primary mt-2">
                <span className="text-xl mr-1">{completedJourney.emoji}</span>
                {completedJourney.title}
              </p>
            )}
          </motion.div>

          {/* Affirmation */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-muted-foreground text-sm mb-8 italic"
          >
            "A 7-Day Snapshot is a recorded moment in time that proves you are who you say you are."
          </motion.p>

          {/* What's Next Section - Paid users */}
          {showWhatsNext && isPaid && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
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
              transition={{ delay: 0.7 }}
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
                
                <PlanSelector
                  onSelect={handlePlanSelect}
                  isLoading={isCheckingOut}
                  selectedPlan={selectedPlan}
                  variant="compact"
                />
                
                <p className="text-xs text-muted-foreground mt-3">
                  Save {pricing.yearlySavingsPercent}% with yearly
                </p>
              </div>
            </motion.div>
          )}

          {/* Certificate Preview Thumbnail */}
          {certificate?.certificate_url && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
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
            transition={{ delay: 0.9 }}
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
                  <PlanSelector
                    onSelect={handlePlanSelect}
                    isLoading={isCheckingOut}
                    selectedPlan={selectedPlan}
                    variant="compact"
                  />
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
            transition={{ delay: 1.0 }}
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
            transition={{ delay: 1.1 }}
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
