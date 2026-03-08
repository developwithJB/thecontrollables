import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Apple, Smartphone, Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface HealthDataSyncProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function HealthDataSync({ open, onOpenChange, userId }: HealthDataSyncProps) {
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("apple");
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: lastSync } = useQuery({
    queryKey: ["health-sync-last", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("health_sync_data")
        .select("synced_at, source")
        .eq("user_id", userId)
        .order("synced_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!userId,
  });

  const handleUpload = async (file: File, source: "apple_health" | "google_fit") => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", source);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error("Please sign in first");
        return;
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/parse-health-export`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Upload failed");
        return;
      }

      toast.success(`Imported ${result.days_imported} days of health data`);
      queryClient.invalidateQueries({ queryKey: ["health-sync-last"] });
      queryClient.invalidateQueries({ queryKey: ["brain-body"] });
      onOpenChange(false);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload health data");
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const source = activeTab === "apple" ? "apple_health" : "google_fit";
    handleUpload(file, source as "apple_health" | "google_fit");
    e.target.value = "";
  };

  const lastSyncDate = lastSync?.synced_at
    ? new Date(lastSync.synced_at).toLocaleDateString()
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-wellness" />
            Connect Health Data
          </DialogTitle>
        </DialogHeader>

        {lastSyncDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <CheckCircle className="h-3.5 w-3.5 text-perspective" />
            Last synced: {lastSyncDate}
            {lastSync?.source && (
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {lastSync.source === "apple_health" ? "Apple" : "Google"}
              </Badge>
            )}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="apple" className="gap-1.5 text-xs">
              <Apple className="h-3.5 w-3.5" />
              Apple Health
            </TabsTrigger>
            <TabsTrigger value="google" className="gap-1.5 text-xs">
              <Smartphone className="h-3.5 w-3.5" />
              Google Fit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="apple" className="space-y-3 mt-3">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">How to export:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs">
                <li>Open the <strong>Health</strong> app on your iPhone</li>
                <li>Tap your <strong>profile picture</strong> (top right)</li>
                <li>Scroll down and tap <strong>Export All Health Data</strong></li>
                <li>Save the ZIP and unzip it</li>
                <li>Upload the <strong>export.xml</strong> file below</li>
              </ol>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Your data stays private — we only extract steps, sleep, and activity.
            </div>
          </TabsContent>

          <TabsContent value="google" className="space-y-3 mt-3">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">How to export:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs">
                <li>Go to <strong>takeout.google.com</strong></li>
                <li>Deselect all, then select <strong>Fit</strong></li>
                <li>Click <strong>Next step</strong> → <strong>Create export</strong></li>
                <li>Download and extract the ZIP</li>
                <li>Upload the <strong>Daily activity metrics</strong> CSV below</li>
              </ol>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Your data stays private — we only extract steps, sleep, and activity.
            </div>
          </TabsContent>
        </Tabs>

        <input
          ref={fileRef}
          type="file"
          accept={activeTab === "apple" ? ".xml" : ".csv"}
          className="hidden"
          onChange={onFileChange}
        />

        <Button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Parsing health data...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload {activeTab === "apple" ? "XML" : "CSV"} File
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
