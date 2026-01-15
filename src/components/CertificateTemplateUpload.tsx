import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, Image, Check, X, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CertificateTemplateUploadProps {
  userId: string;
}

export function CertificateTemplateUpload({ userId }: CertificateTemplateUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch current template
  const { data: currentTemplate } = useQuery({
    queryKey: ["certificate-template", userId],
    queryFn: async () => {
      const { data } = supabase.storage
        .from("certificates")
        .getPublicUrl(`templates/${userId}/template.png`);
      
      // Check if file exists by fetching it
      try {
        const response = await fetch(data.publicUrl, { method: "HEAD" });
        if (response.ok) {
          return data.publicUrl;
        }
      } catch {
        // Template doesn't exist
      }
      return null;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Please upload an image file");
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File size must be less than 5MB");
      }

      const storagePath = `templates/${userId}/template.png`;
      
      const { error } = await supabase.storage
        .from("certificates")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("certificates")
        .getPublicUrl(storagePath);

      return data.publicUrl;
    },
    onSuccess: (url) => {
      queryClient.invalidateQueries({ queryKey: ["certificate-template"] });
      toast({
        title: "Template uploaded",
        description: "Your certificate background has been saved.",
      });
      setPreviewUrl(null);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden"
    >
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Image className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Certificate Template</h3>
            <p className="text-xs text-muted-foreground">Upload your custom background design</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Template Preview */}
        {currentTemplate && !previewUrl && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Template</p>
            <div className="relative rounded-lg overflow-hidden border border-border/50">
              <img 
                src={currentTemplate} 
                alt="Current certificate template" 
                className="w-full h-auto"
              />
              <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute bottom-2 right-2 gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview with Text
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Certificate Preview</DialogTitle>
                  </DialogHeader>
                  <CertificatePreview templateUrl={currentTemplate} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {/* New Template Preview */}
        {previewUrl && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">New Template Preview</p>
            <div className="rounded-lg overflow-hidden border-2 border-primary/50">
              <img 
                src={previewUrl} 
                alt="New template preview" 
                className="w-full h-auto"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="flex-1 gap-2"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save Template
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={uploadMutation.isPending}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Upload Button */}
        {!previewUrl && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full gap-2"
            >
              <Upload className="w-4 h-4" />
              {currentTemplate ? "Upload New Template" : "Upload Template"}
            </Button>
            
            {/* Instructions */}
            <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Template Guidelines:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Recommended size: <span className="text-foreground">1200 × 630 pixels</span></li>
                <li>Leave space for text overlay (centered)</li>
                <li>Format: PNG or JPG (max 5MB)</li>
              </ul>
              <p className="pt-2 font-medium text-foreground">Text that will be added:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>"Certificate of Completion" (title)</li>
                <li>"I committed to controlling what I could..."</li>
                <li>Date range (e.g., "Jan 1 – Jan 7, 2025")</li>
                <li>User's name</li>
                <li>"The Controllables" (footer)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Preview component showing what the certificate will look like
function CertificatePreview({ templateUrl }: { templateUrl: string }) {
  return (
    <div className="relative">
      <img src={templateUrl} alt="Template" className="w-full h-auto rounded-lg" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
        <p className="text-2xl md:text-4xl font-bold text-neutral-800 drop-shadow-sm mb-4">
          Certificate of Completion
        </p>
        <p className="text-4xl md:text-5xl mb-6">✨</p>
        <p className="text-base md:text-xl text-neutral-600 mb-1">
          I committed to controlling what I could
        </p>
        <p className="text-base md:text-xl text-neutral-600 mb-6">
          and surrendering what I could not
        </p>
        <p className="text-sm md:text-lg text-neutral-500 mb-6">
          January 1, 2025 – January 7, 2025
        </p>
        <p className="text-xl md:text-2xl font-bold text-neutral-800 mb-8">
          Your Name
        </p>
        <p className="text-sm text-neutral-400">The Controllables</p>
      </div>
    </div>
  );
}
