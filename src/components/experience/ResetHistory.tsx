import { useState } from "react";
import { motion } from "framer-motion";
import { Award, Download, Calendar, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

  const handleDownloadCertificate = async (session: ResetSession) => {
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
        
        // Use the URL from the response
        const certificateUrl = data.certificate_url;
        
        // Download the file
        await downloadFile(certificateUrl, session.start_date);
        
        toast({
          title: "Certificate generated & downloaded",
          description: "Your certificate has been created and saved.",
        });
      } else {
        // Download existing certificate
        await downloadFile(cert.certificate_url, session.start_date);
        
        toast({
          title: "Certificate downloaded",
          description: "Your certificate has been saved.",
        });
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

  const downloadFile = async (url: string, startDate: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch certificate file");
    }

    const blob = await response.blob();
    const contentType = blob.type;
    const extension = contentType.includes("svg") ? "svg" : "png";

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `controllables-certificate-${format(new Date(startDate), "yyyy-MM-dd")}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  if (completedSessions.length === 0) {
    return null;
  }

  return (
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
                  onClick={() => handleDownloadCertificate(session)}
                  disabled={isProcessing}
                  className="gap-1.5"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {hasCert ? "Download" : "Generate"} Certificate
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
