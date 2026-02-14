import { useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DailyAlignmentPromoProps {
  onUpgrade: () => void;
}

export function DailyAlignmentPromo({ onUpgrade }: DailyAlignmentPromoProps) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            Daily Alignment™
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Personalized scripture. Real-time growth reflection. One clear action per day. Built from your actual life.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs border-primary/30 text-primary hover:bg-primary/10"
        onClick={onUpgrade}
      >
        Upgrade to Premium
      </Button>
    </div>
  );
}
