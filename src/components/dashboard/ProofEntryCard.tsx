import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Loader2, X, CheckCircle2, LockKeyhole, Share2 } from "lucide-react";
import { useIGProof, type IGProofAnalysis } from "@/hooks/useIGProof";
import { RingSuggestionResult } from "./RingSuggestionResult";
import type { RingKey } from "@/hooks/useDailyRings";
import { buildShareProofPayload } from "@/lib/shareProof";

interface ProofEntryCardProps {
  userId?: string;
  onRingFilled?: (key: RingKey, response: string) => Promise<void>;
  onClose?: () => void;
}

export const ProofEntryCard = ({ userId, onRingFilled, onClose }: ProofEntryCardProps) => {
  const [note, setNote] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { analyzing, analysis, saving, analyzeCaption, analyzeScreenshot, saveEntry, clearAnalysis } = useIGProof(userId);
  const sharePreview = buildShareProofPayload({ kind: "tracking_started", visibility: "anonymous" });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));

    const result = await analyzeScreenshot(file);
    if (result) {
      setImageUrl(result.imageUrl);
      // Auto-analyze with description or generic label
      if (note.trim()) {
        await analyzeCaption(note.trim());
      }
    }
  };

  const handleAnalyze = async () => {
    if (note.trim()) {
      await analyzeCaption(note.trim());
    }
  };

  const handleSave = async (ringKey: RingKey, attachToRing: boolean) => {
    const result = await saveEntry({
      ringKey,
      sourceType: imageUrl ? "screenshot" : "caption",
      captionText: note || undefined,
      imageUrl: imageUrl || undefined,
      interpretation: analysis?.interpretation,
      tags: analysis?.tags,
      attachToRing,
    });

    if (result && attachToRing && onRingFilled) {
      await onRingFilled(ringKey, analysis?.interpretation || "Completed via proof entry");
    }

    if (result) {
      setNote("");
      setImageFile(null);
      setImagePreview(null);
      setImageUrl(null);
      clearAnalysis();
    }
  };

  if (!userId) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="dashboard-os-card overflow-hidden rounded-2xl"
    >
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent shadow-[inset_0_0_18px_hsl(var(--accent)/0.08)]">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Daily Proof</p>
            <h3 className="text-sm font-semibold text-foreground">One kept promise</h3>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted transition-colors">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="p-4 pt-2">
        {analysis ? (
          <RingSuggestionResult
            analysis={analysis}
            saving={saving}
            onSave={handleSave}
            onBack={clearAnalysis}
            imagePreview={imagePreview}
            captionPreview={note}
          />
        ) : (
          <div className="space-y-3">
            <div className="dashboard-os-card rounded-2xl p-3">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/70" />
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-3xl" aria-hidden="true">
                  {sharePreview.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Share-safe card</p>
                  <p className="font-display text-base font-semibold leading-tight text-foreground">{sharePreview.headline}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <Share2 className="h-3 w-3" />
                      The Dashboard
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      <LockKeyhole className="h-3 w-3" />
                      Private by default
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 280))}
              placeholder="What proof are you keeping?"
              className="min-h-[72px] resize-none border-primary/20 bg-background/65 text-sm"
              maxLength={280}
            />

            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Proof" className="w-full h-28 object-cover rounded-lg" />
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
                className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/20 bg-background/40 transition-colors hover:border-accent/50 hover:bg-accent/5"
              >
                <ImagePlus className="w-4 h-4 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Add a photo (optional)</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {analyzing && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Reading proof...
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={!note.trim() || note.trim().length <= 3 || analyzing}
              className="dashboard-primary-glow h-11 w-full gap-2"
              size="sm"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Reading...
                </>
              ) : (
                "Save Proof"
              )}
            </Button>

            <p className="text-[10px] text-muted-foreground text-center">
              {note.length}/280
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
