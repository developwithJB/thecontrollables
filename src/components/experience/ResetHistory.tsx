import { useState } from "react";
import { motion } from "framer-motion";
import { Award, Eye, Calendar, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CertificatePreview } from "./CertificatePreview";

interface ResetSession {
  id: string;
  start_date: string;
  status: string;
  completed_at: string | null;
  current_day: number;
}

interface Certificate {
  id: string;
  reset_session_id: string;
  certificate_url: string | null;
  start_date: string;
  end_date: string;
}

interface ResetHistoryProps {
  resetSessions: ResetSession[];
  userId: string;
}

export function ResetHistory({ resetSessions, userId }: ResetHistoryProps) {
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<{
    url: string;
    startDate: string;
  } | null>(null);

  const completedSessions = resetSessions.filter(s => s.status === "completed");

  // Fetch all certificates for this user
  const { data: certificates = [], refetch: refetchCertificates } = useQuery({
    queryKey: ["certificates", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return data as Certificate[];
    },
    enabled: !!userId,
  });

  const getCertificateForSession = (sessionId: string) => {
    return certificates.find(c => c.reset_session_id === sessionId);
  };

  const handleViewCertificate = async (session: ResetSession) => {
    setProcessingId(session.id);

    try {
      let cert = getCertificateForSession(session.id);

      // If no certificate exists, generate one
      if (!cert?.certificate_url) {
        console.log("Generating certificate for session:", session.id);
        
        const { data, error } = await supabase.functions.invoke("generate-certificate", {
          body: { reset_session_id: session.id },
        });

        if (error) {
          throw new Error(error.message || "Failed to generate certificate");
        }

        if (!data?.certificate_url) {
          throw new Error("No certificate URL returned");
        }

        // Refetch certificates to get the new one
        await refetchCertificates();
        
        // Open preview with the new certificate URL
        setSelectedCertificate({
          url: data.certificate_url,
          startDate: session.start_date,
        });
        setShowPreview(true);
        
        toast({
          title: "Certificate generated",
          description: "Your certificate is ready to view and download.",
        });
      } else {
        // Open preview with existing certificate
        setSelectedCertificate({
          url: cert.certificate_url,
          startDate: session.start_date,
        });
        setShowPreview(true);
      }
    } catch (error) {
      console.error("Certificate error:", error);
      toast({
        title: "Error with certificate",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setSelectedCertificate(null);
  };

  if (completedSessions.length === 0) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Award className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">Completed Resets</h3>
              <p className="text-xs text-muted-foreground">Your 7-Day journeys with certificates</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {completedSessions.map((session, index) => {
            const startDate = new Date(session.start_date + "T00:00:00");
            const endDate = new Date(session.start_date + "T00:00:00");
            endDate.setDate(endDate.getDate() + 6);
            const hasCert = !!getCertificateForSession(session.id)?.certificate_url;
            const isProcessing = processingId === session.id;

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl bg-muted/30 border border-border/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Reset #{completedSessions.length - index}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {format(startDate, "MMM d")} – {format(endDate, "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewCertificate(session)}
                    disabled={isProcessing}
                    className="gap-1.5"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    {isProcessing ? (hasCert ? "Loading..." : "Generating...") : "View Certificate"}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Certificate Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-center">Your Certificate</DialogTitle>
          </DialogHeader>
          {selectedCertificate && (
            <CertificatePreview
              certificateUrl={selectedCertificate.url}
              startDate={selectedCertificate.startDate}
              onClose={handleClosePreview}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
