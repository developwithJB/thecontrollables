import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Award, Download, Calendar, Check, Loader2 } from "lucide-react";
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
  challenge_id: string;
  storage_path: string;
  start_date: string;
  end_date: string;
}

interface ResetHistoryProps {
  resetSessions: ResetSession[];
  userId: string;
}

export function ResetHistory({ resetSessions, userId }: ResetHistoryProps) {
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const completedSessions = resetSessions.filter(s => s.status === "completed");

  // Fetch all certificates for this user
  const { data: certificates = [] } = useQuery({
    queryKey: ["all-certificates", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("completion_certificates")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return data as Certificate[];
    },
    enabled: !!userId,
  });

  const getCertificateForSession = (sessionId: string) => {
    return certificates.find(c => c.challenge_id === sessionId);
  };

  const getCertificateUrl = (storagePath: string): string => {
    const { data } = supabase.storage.from("certificates").getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const handleDownloadCertificate = async (session: ResetSession) => {
    setDownloadingId(session.id);
    
    try {
      const cert = getCertificateForSession(session.id);
      
      if (cert?.storage_path) {
        const url = getCertificateUrl(cert.storage_path);
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `controllables-certificate-${format(new Date(session.start_date), "yyyy-MM-dd")}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        
        toast({
          title: "Certificate downloaded",
          description: "Your certificate has been saved.",
        });
      } else {
        // Check for custom template
        const { data: templateData } = supabase.storage
          .from("certificates")
          .getPublicUrl(`templates/${userId}/template.png`);
        
        let templateUrl: string | null = null;
        try {
          const response = await fetch(templateData.publicUrl, { method: "HEAD" });
          if (response.ok) {
            templateUrl = templateData.publicUrl;
          }
        } catch {
          // No template
        }

        // Generate certificate on the fly
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 630;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) throw new Error("Canvas not supported");

        // Draw background - either custom template or default
        if (templateUrl) {
          try {
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = templateUrl!;
            });
            ctx.drawImage(img, 0, 0, 1200, 630);
          } catch {
            // Fallback to default
            ctx.fillStyle = "#fafafa";
            ctx.fillRect(0, 0, 1200, 630);
            ctx.strokeStyle = "#e5e5e5";
            ctx.lineWidth = 2;
            ctx.strokeRect(40, 40, 1120, 550);
          }
        } else {
          // Default background
          ctx.fillStyle = "#fafafa";
          ctx.fillRect(0, 0, 1200, 630);
          ctx.strokeStyle = "#e5e5e5";
          ctx.lineWidth = 2;
          ctx.strokeRect(40, 40, 1120, 550);
        }

        // Text styling with shadow for visibility
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
        ctx.shadowBlur = 4;

        // Title
        ctx.fillStyle = "#171717";
        ctx.font = "bold 48px system-ui, sans-serif";
        ctx.fillText("Certificate of Completion", 600, 140);

        // Emoji
        ctx.shadowBlur = 0;
        ctx.font = "64px system-ui, sans-serif";
        ctx.fillText("✨", 600, 220);
        ctx.shadowBlur = 4;

        // Statement
        ctx.font = "24px system-ui, sans-serif";
        ctx.fillStyle = "#404040";
        ctx.fillText("I committed to controlling what I could", 600, 300);
        ctx.fillText("and surrendering what I could not", 600, 340);

        // Dates
        const startDate = new Date(session.start_date + "T00:00:00");
        const endDate = new Date(session.start_date + "T00:00:00");
        endDate.setDate(endDate.getDate() + 6);
        
        const startFormatted = startDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        const endFormatted = endDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        ctx.font = "20px system-ui, sans-serif";
        ctx.fillStyle = "#737373";
        ctx.fillText(`${startFormatted} – ${endFormatted}`, 600, 400);

        // Footer
        ctx.font = "16px system-ui, sans-serif";
        ctx.fillStyle = "#a3a3a3";
        ctx.fillText("The Controllables", 600, 560);
        ctx.shadowBlur = 0;

        // Convert to blob and download
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error("Failed to create blob"));
          }, "image/png");
        });

        // Save to storage
        const storagePath = `${userId}/${session.id}.png`;
        await supabase.storage
          .from("certificates")
          .upload(storagePath, blob, {
            contentType: "image/png",
            upsert: true,
          });

        // Save certificate record
        await supabase
          .from("completion_certificates")
          .upsert({
            user_id: userId,
            challenge_id: session.id,
            start_date: session.start_date,
            end_date: endDate.toISOString().split("T")[0],
            storage_path: storagePath,
          }, {
            onConflict: "user_id,challenge_id",
          });

        // Download
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `controllables-certificate-${format(new Date(session.start_date), "yyyy-MM-dd")}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);

        toast({
          title: "Certificate generated & downloaded",
          description: "Your certificate has been created and saved.",
        });
      }
    } catch (error) {
      toast({
        title: "Error downloading certificate",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
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
          const hasCert = !!getCertificateForSession(session.id);
          const isDownloading = downloadingId === session.id;

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
                  disabled={isDownloading}
                  className="gap-1.5"
                >
                  {isDownloading ? (
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
