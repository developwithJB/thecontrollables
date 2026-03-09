import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus } from "lucide-react";
import type { PlannerRoutine, Recurrence, EnergyLevel } from "@/hooks/usePlanner";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface PlannerRoutineManagerProps {
  open: boolean;
  onClose: () => void;
  routines: PlannerRoutine[];
  onCreateRoutine: (input: {
    title: string;
    recurrence: Recurrence;
    recurrence_days: number[];
    default_start_time: string | null;
    default_end_time: string | null;
    energy_level: EnergyLevel | null;
    user_id: string;
    is_active: boolean;
    description: string | null;
  }) => void;
  onDeleteRoutine: (id: string) => void;
  userId: string;
}

export const PlannerRoutineManager = ({
  open,
  onClose,
  routines,
  onCreateRoutine,
  onDeleteRoutine,
  userId,
}: PlannerRoutineManagerProps) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("daily");
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("");
  const [energy, setEnergy] = useState<EnergyLevel | "">("");

  const handleCreate = () => {
    if (!title.trim()) return;
    onCreateRoutine({
      title: title.trim(),
      recurrence,
      recurrence_days: recurrence === "weekly" ? days : [],
      default_start_time: startTime || null,
      default_end_time: null,
      energy_level: energy || null,
      user_id: userId,
      is_active: true,
      description: null,
    });
    setTitle("");
    setShowForm(false);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Routines</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {routines.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
            >
              <div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {r.recurrence}
                  {r.recurrence === "weekly" &&
                    r.recurrence_days.length > 0 &&
                    ` · ${r.recurrence_days.map((d) => DAY_LABELS[d]).join(", ")}`}
                  {r.default_start_time && ` · ${r.default_start_time.slice(0, 5)}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDeleteRoutine(r.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {showForm ? (
            <div className="space-y-3 p-3 rounded-lg border border-border">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Routine name..."
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={recurrence} onValueChange={(v) => setRecurrence(v as Recurrence)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekdays">Weekdays</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={energy} onValueChange={(v) => setEnergy(v as EnergyLevel)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Energy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recurrence === "weekly" && (
                <div className="flex gap-2 flex-wrap">
                  {DAY_LABELS.map((label, idx) => (
                    <label key={idx} className="flex items-center gap-1 text-xs">
                      <Checkbox
                        checked={days.includes(idx)}
                        onCheckedChange={(checked) =>
                          setDays(
                            checked
                              ? [...days, idx]
                              : days.filter((d) => d !== idx)
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              )}

              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="Start time"
              />

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCreate} disabled={!title.trim()} className="flex-1">
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Routine
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
