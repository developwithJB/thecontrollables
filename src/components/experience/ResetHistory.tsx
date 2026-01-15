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

  const handleDownloadCertificate = async (session: ResetSession) => {
    setDownloadingId(session.id);

    const filename = `controllables-certificate-${format(new Date(session.start_date), "yyyy-MM-dd")}.png`;

    const downloadBlobToFile = (blob: Blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    };
    
    try {
      const cert = getCertificateForSession(session.id);

      // Prefer downloading via Storage API (avoids saving JSON/404 pages as .png)
      if (cert?.storage_path) {
        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from("certificates")
          .download(cert.storage_path);

        if (!downloadError && fileBlob && fileBlob.size > 0) {
          downloadBlobToFile(fileBlob);
          toast({
            title: "Certificate downloaded",
            description: "Your certificate has been saved.",
          });
          return;
        }
        // If the DB record exists but the file is missing/corrupt, regenerate below.
      }
        // Check for global admin template
        const { data: templateData } = supabase.storage
          .from("certificates")
          .getPublicUrl("Certificate Template.png");
        
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
        const ctx = canvas.getContext("2d", { willReadFrequently: false });
        
        if (!ctx) throw new Error("Canvas not supported");

        // Load template and use its natural dimensions
        if (templateUrl) {
          try {
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = templateUrl!;
            });
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          } catch {
            throw new Error("Failed to load certificate template");
          }
        } else {
          throw new Error("Certificate template not found");
        }

        const centerX = canvas.width / 2;
        const canvasHeight = canvas.height;

        // Text styling
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Fetch user profile for display name
        const { data: profileData } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .single();
        
        const displayName = profileData?.display_name || "Participant";
        
        // User's display name
        ctx.fillStyle = "#1a1a1a";
        ctx.font = "italic 56px Georgia, serif";
        ctx.fillText(displayName, centerX, canvasHeight * 0.5);

        // Description text
        ctx.fillStyle = "#404040";
        ctx.font = "18px system-ui, sans-serif";
        ctx.fillText("For completing the 7-Day Reset Challenge", centerX, canvasHeight * 0.6);
        ctx.fillText("I committed to controlling what I could and surrendering what I could not.", centerX, canvasHeight * 0.64);

        // Date range
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
        ctx.font = "16px system-ui, sans-serif";
        ctx.fillStyle = "#404040";
        ctx.fillText(`${startFormatted} – ${endFormatted}`, centerX * 0.66, canvasHeight * 0.83);

        // "The Controllables" branding
        ctx.font = "italic 20px Georgia, serif";
        ctx.fillStyle = "#1a1a1a";
        ctx.fillText("The Controllables", centerX * 1.34, canvasHeight * 0.83);

        // Convert to blob with high quality
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error("Failed to create certificate image"));
            },
            "image/png",
            1.0 // Maximum quality
          );
        });

        // Save to storage
        const storagePath = `${userId}/${session.id}.png`;
        const { error: uploadError } = await supabase.storage
          .from("certificates")
          .upload(storagePath, blob, {
            contentType: "image/png",
            upsert: true,
          });
        if (uploadError) throw uploadError;

        // Save certificate record
        const { error: certUpsertError } = await supabase
          .from("completion_certificates")
          .upsert(
            {
              user_id: userId,
              challenge_id: session.id,
              start_date: session.start_date,
              end_date: endDate.toISOString().split("T")[0],
              storage_path: storagePath,
            },
            {
              onConflict: "user_id,challenge_id",
            }
          );
        if (certUpsertError) throw certUpsertError;

        // Download
        downloadBlobToFile(blob);

        toast({
          title: "Certificate generated & downloaded",
          description: "Your certificate has been created and saved.",
        });
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
