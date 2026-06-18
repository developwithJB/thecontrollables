import { useState } from "react";
import { Camera, CheckCircle2, ImagePlus, ShieldCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useControllablesDex } from "@/hooks/useControllablesDex";
import { BOOK_CONTROLLABLES } from "@/lib/bookWorld";
import type { ControllableType } from "@/components/ControllableCard";
import type { DexProofEntry, DexProofVisibility } from "@/lib/controllablesDex";
import { cn } from "@/lib/utils";

interface PhotoProofCaptureProps {
  userId: string | null;
  missionId: string;
  targetControllable: ControllableType;
  city?: string;
  state?: string;
  visibility?: DexProofVisibility;
  onSaved?: (entry: DexProofEntry) => void;
  onSkip?: () => void;
}

interface PreparedPhoto {
  imageUrl: string;
  capturedAt: string;
  fileName: string;
}

export function PhotoProofCapture({
  userId,
  missionId,
  targetControllable,
  city = "",
  state = "",
  visibility = "private",
  onSaved,
  onSkip,
}: PhotoProofCaptureProps) {
  const { toast } = useToast();
  const { addProofEntry } = useControllablesDex(userId);
  const [selectedControllable, setSelectedControllable] = useState<ControllableType>(targetControllable);
  const [caption, setCaption] = useState("");
  const [preparedPhoto, setPreparedPhoto] = useState<PreparedPhoto | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsPreparing(true);
    try {
      const imageUrl = await createSanitizedImagePreview(file);
      setPreparedPhoto({
        imageUrl,
        capturedAt: file.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString(),
        fileName: file.name,
      });
      toast({ title: "Photo ready", description: "Exact photo metadata was stripped from the saved preview." });
    } catch {
      toast({
        title: "Photo could not be prepared safely",
        description: "Try a different image file.",
        variant: "destructive",
      });
    } finally {
      setIsPreparing(false);
      event.target.value = "";
    }
  };

  const handleSave = () => {
    if (!preparedPhoto) return;

    setIsSaving(true);
    const entry = addProofEntry({
      missionId,
      targetControllable: selectedControllable,
      imageUrl: preparedPhoto.imageUrl,
      capturedAt: preparedPhoto.capturedAt,
      city,
      state,
      caption,
      visibility,
    });
    setIsSaving(false);
    toast({ title: "Proof saved privately", description: "Your Dex collected one real-life rep." });
    onSaved?.(entry);
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.16em]">
            The Controllables Dex
          </Badge>
          <h3 className="text-sm font-semibold text-foreground">Add photo proof?</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Collect proof of the rep. The photo stays private by default.
          </p>
        </div>
        {onSkip ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onSkip}>
            <X className="h-4 w-4" />
            <span className="sr-only">Skip photo proof</span>
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
        <label
          className={cn(
            "flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/70 bg-background/70 text-center transition-colors hover:bg-muted/50",
            preparedPhoto && "border-primary/30",
          )}
        >
          {preparedPhoto ? (
            <img src={preparedPhoto.imageUrl} alt="Selected proof preview" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 px-3 text-xs text-muted-foreground">
              <ImagePlus className="h-6 w-6 text-primary" />
              {isPreparing ? "Preparing..." : "Select one photo"}
            </span>
          )}
          <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} disabled={isPreparing} />
        </label>

        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-1.5">
            {BOOK_CONTROLLABLES.map((controllable) => (
              <button
                key={controllable.id}
                type="button"
                onClick={() => setSelectedControllable(controllable.id)}
                className={cn(
                  "rounded-xl border px-2 py-2 text-center transition-colors",
                  selectedControllable === controllable.id
                    ? "border-primary/30 bg-primary/10"
                    : "border-border/50 bg-background/70 hover:bg-muted/50",
                )}
                aria-label={`Choose ${controllable.name}`}
              >
                <span className="block text-lg" aria-hidden="true">
                  {controllable.emoji}
                </span>
                <span className="mt-1 block truncate text-[10px] text-muted-foreground">{controllable.name}</span>
              </button>
            ))}
          </div>

          <Textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value.slice(0, 120))}
            placeholder="Optional caption. Private unless you choose to share it later."
            className="min-h-[76px] resize-none text-sm"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleSave} disabled={!preparedPhoto || isSaving || isPreparing} className="gap-2">
              <Camera className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save proof privately"}
            </Button>
            {onSkip ? (
              <Button variant="ghost" onClick={onSkip}>
                Skip
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Exact GPS is not stored. EXIF metadata is stripped from the saved preview. Captions stay out of share copy by default.
      </div>
    </div>
  );
}

async function createSanitizedImagePreview(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const maxEdge = 1280;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.84);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = src;
  });
}
