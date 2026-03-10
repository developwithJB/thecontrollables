import { useState } from "react";
import { format, subDays } from "date-fns";
import { CalendarIcon, History, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface QuickHistoryEntryProps {
  userId?: string;
}

const RINGS = [
  { key: "notice", label: "Notice", color: "text-blue-400" },
  { key: "choose", label: "Choose", color: "text-purple-400" },
  { key: "prove", label: "Prove", color: "text-orange-400" },
  { key: "charge", label: "Charge", color: "text-green-400" },
  { key: "align", label: "Align", color: "text-yellow-400" },
] as const;

export const QuickHistoryEntry = ({ userId }: QuickHistoryEntryProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(subDays(new Date(), 1));
  const [rings, setRings] = useState<Record<string, boolean>>({
    notice: false,
    choose: false,
    prove: false,
    charge: false,
    align: false,
  });
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleRing = (key: string) => {
    setRings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);

    try {
      const ringDate = format(date, "yyyy-MM-dd");

      const { error } = await supabase.from("daily_rings").upsert(
        {
          user_id: userId,
          ring_date: ringDate,
          notice_completed: rings.notice,
          choose_completed: rings.choose,
          prove_completed: rings.prove,
          charge_completed: rings.charge,
          align_completed: rings.align,
          daily_recap: note || null,
        },
        { onConflict: "user_id,ring_date" }
      );

      if (error) throw error;

      toast({
        title: "Day logged",
        description: `Rings for ${format(date, "MMM d")} saved.`,
      });

      // Reset form
      setRings({ notice: false, choose: false, prove: false, charge: false, align: false });
      setNote("");
      setOpen(false);
    } catch (err) {
      console.error("Quick history save error:", err);
      toast({
        title: "Error",
        description: "Could not save historical entry.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const anySelected = Object.values(rings).some(Boolean);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-border/50 hover:bg-muted/50"
        >
          <History className="w-3.5 h-3.5" />
          Log Past Day
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
        <SheetHeader>
          <SheetTitle className="text-sm">Log a Past Day</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4 pb-4">
          {/* Date Picker */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal text-sm",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(d) => d >= new Date() || d < subDays(new Date(), 30)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Ring Toggles */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">
              Rings Completed
            </label>
            <div className="space-y-2.5">
              {RINGS.map((ring) => (
                <div
                  key={ring.key}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border border-border/30"
                >
                  <span className={cn("text-sm font-medium", ring.color)}>
                    {ring.label}
                  </span>
                  <Switch
                    checked={rings[ring.key]}
                    onCheckedChange={() => toggleRing(ring.key)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Note (optional)
            </label>
            <Textarea
              placeholder="How was this day?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-sm resize-none h-16"
            />
          </div>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={!anySelected || saving || !userId}
            className="w-full gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Entry"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
