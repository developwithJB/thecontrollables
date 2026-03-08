import { useState, useEffect } from "react";
import { Loader2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getJourneyById } from "@/lib/guidedJourneys";

interface CirclePreview {
  id: string;
  name: string;
  journeyId: string | null;
  memberCount: number;
}

interface JoinCircleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin: (params: { inviteCode: string; displayName: string }) => void;
  isJoining: boolean;
  displayName: string;
  lookupCircle: (code: string) => Promise<CirclePreview | null>;
  initialCode?: string;
}

export function JoinCircleDialog({
  isOpen,
  onOpenChange,
  onJoin,
  isJoining,
  displayName,
  lookupCircle,
  initialCode,
}: JoinCircleDialogProps) {
  const [code, setCode] = useState(initialCode || "");
  const [preview, setPreview] = useState<CirclePreview | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const [error, setError] = useState("");

  // Auto-lookup when code is 6 chars
  useEffect(() => {
    if (code.length === 6) {
      setIsLooking(true);
      setError("");
      lookupCircle(code).then((result) => {
        setPreview(result);
        if (!result) setError("No circle found with this code");
        setIsLooking(false);
      });
    } else {
      setPreview(null);
      setError("");
    }
  }, [code, lookupCircle]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setCode(initialCode || "");
      setPreview(null);
      setError("");
    }
  }, [isOpen, initialCode]);

  const journey = preview?.journeyId ? getJourneyById(preview.journeyId) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Join a Circle</DialogTitle>
          <DialogDescription>
            Enter the 6-character invite code shared by a circle member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            className="text-center text-lg tracking-[0.3em] font-mono uppercase"
            maxLength={6}
            autoFocus
          />

          {isLooking && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Looking up circle…
            </div>
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          {preview && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm text-foreground">{preview.name}</span>
              </div>
              {journey && (
                <p className="text-xs text-muted-foreground">
                  <span className="mr-1">{journey.emoji}</span>
                  {journey.title}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {preview.memberCount}/5 members
              </p>
            </div>
          )}

          <Button
            className="w-full"
            disabled={!preview || isJoining}
            onClick={() => {
              onJoin({ inviteCode: code, displayName });
              onOpenChange(false);
            }}
          >
            {isJoining ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining…
              </>
            ) : (
              "Join Circle"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
