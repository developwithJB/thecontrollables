import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Type, Loader2, X, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIGProof, type IGProofAnalysis } from "@/hooks/useIGProof";
import { RingSuggestionResult } from "./RingSuggestionResult";
import type { RingKey } from "@/hooks/useDailyRings";

interface InstagramInputCardProps {
  userId?: string;
  onRingFilled?: (key: RingKey, response: string) => Promise<void>;
  onClose?: () => void;
  preselectedRing?: RingKey;
}

type Tab = "caption" | "screenshot";

export const InstagramInputCard = ({ userId, onRingFilled, onClose, preselectedRing }: InstagramInputCardProps) => {
  const [tab, setTab] = useState<Tab>("caption");
  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [descriptionForImage, setDescriptionForImage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { analyzing, analysis, saving, analyzeCaption, analyzeScreenshot, saveEntry, clearAnalysis } = useIGProof(userId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));

    const result = await analyzeScreenshot(file);
    if (result) {
      setImageUrl(result.imageUrl);
    }
  };

  const handleAnalyze = async () => {
    if (tab === "caption" && caption.trim()) {
      await analyzeCaption(caption.trim());
    } else if (tab === "screenshot" && descriptionForImage.trim()) {
      await analyzeCaption(descriptionForImage.trim());
    }
  };

  const handleSave = async (ringKey: RingKey, attachToRing: boolean) => {
    const result = await saveEntry({
      ringKey,
      sourceType: tab === "screenshot" && imageUrl ? "screenshot" : "caption",
      captionText: tab === "caption" ? caption : descriptionForImage,
      imageUrl: imageUrl || undefined,
      interpretation: analysis?.interpretation,
      tags: analysis?.tags,
      attachToRing,
    });

    if (result && attachToRing && onRingFilled) {
      await onRingFilled(ringKey, analysis?.interpretation || "Completed via IG Proof");
    }

    if (result) {
      // Reset
      setCaption("");
      setImageFile(null);
      setImagePreview(null);
      setImageUrl(null);
      setDescriptionForImage("");
      clearAnalysis();
    }
  };

  const canAnalyze = tab === "caption" ? caption.trim().length > 5 : descriptionForImage.trim().length > 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-xl border bg-card shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--wellness))] flex items-center justify-center">
            <Camera className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">IG Proof</h3>
            <p className="text-[10px] text-muted-foreground">Turn posts into ring data</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted transition-colors">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {analysis ? (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 pt-2">
            <RingSuggestionResult
              analysis={analysis}
              saving={saving}
              onSave={handleSave}
              onBack={clearAnalysis}
              imagePreview={imagePreview}
              captionPreview={tab === "caption" ? caption : descriptionForImage}
              preselectedRing={preselectedRing}
            />
          </motion.div>
        ) : (
          <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 pt-2">
            {/* Tabs */}
            <div className="flex gap-1 mb-3 bg-muted/50 rounded-lg p-0.5">
              <button
                onClick={() => setTab("caption")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all",
                  tab === "caption" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Type className="w-3 h-3" />
                Paste Caption
              </button>
              <button
                onClick={() => setTab("screenshot")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all",
                  tab === "screenshot" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Camera className="w-3 h-3" />
                Screenshot
              </button>
            </div>

            {tab === "caption" ? (
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Paste your Instagram caption or draft here..."
                className="min-h-[80px] resize-none text-sm mb-3"
                maxLength={2000}
              />
            ) : (
              <div className="space-y-3 mb-3">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Screenshot preview" className="w-full h-32 object-cover rounded-lg" />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); setImageUrl(null); }}
                      className="absolute top-1.5 right-1.5 p-1 bg-background/80 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-accent/50 hover:bg-accent/5 transition-colors"
                  >
                    <ImagePlus className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Tap to upload screenshot</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Textarea
                  value={descriptionForImage}
                  onChange={(e) => setDescriptionForImage(e.target.value)}
                  placeholder="Describe what's in the post (e.g., 'Morning workout at the gym, 5am session')..."
                  className="min-h-[60px] resize-none text-sm"
                  maxLength={2000}
                />
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={!canAnalyze || analyzing}
              className="w-full gap-2"
              size="sm"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze Content"
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
