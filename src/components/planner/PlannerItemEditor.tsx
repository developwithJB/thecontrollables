import { useState } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  PlannerItem,
  PlannerItemType,
  EnergyLevel,
  CreatePlannerItemInput,
  UpdatePlannerItemInput,
} from "@/hooks/usePlanner";

interface PlannerItemEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (input: CreatePlannerItemInput | UpdatePlannerItemInput) => void;
  item?: PlannerItem | null;
  defaultDate: string;
  isSaving?: boolean;
}

export const PlannerItemEditor = ({
  open,
  onClose,
  onSave,
  item,
  defaultDate,
  isSaving,
}: PlannerItemEditorProps) => {
  const isEditing = !!item;

  const [title, setTitle] = useState(item?.title ?? "");
  const [itemType, setItemType] = useState<PlannerItemType>(item?.item_type ?? "task");
  const [date, setDate] = useState(item?.scheduled_date ?? defaultDate);
  const [startTime, setStartTime] = useState(item?.start_time?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(item?.end_time?.slice(0, 5) ?? "");
  const [energy, setEnergy] = useState<EnergyLevel | "">(item?.energy_level ?? "");
  const [description, setDescription] = useState(item?.description ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isEditing && item) {
      onSave({
        id: item.id,
        title: title.trim(),
        item_type: itemType,
        scheduled_date: date,
        start_time: startTime || null,
        end_time: endTime || null,
        energy_level: energy || null,
        description: description.trim() || null,
      } as UpdatePlannerItemInput);
    } else {
      onSave({
        title: title.trim(),
        item_type: itemType,
        scheduled_date: date,
        start_time: startTime || null,
        end_time: endTime || null,
        energy_level: energy || null,
        description: description.trim() || null,
      } as CreatePlannerItemInput);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Item" : "Add to Plan"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="title">What are you planning?</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning workout, Team call..."
              autoFocus
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={itemType} onValueChange={(v) => setItemType(v as PlannerItemType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="time_block">Time Block</SelectItem>
                  <SelectItem value="routine_instance">Routine</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Energy</Label>
              <Select value={energy} onValueChange={(v) => setEnergy(v as EnergyLevel)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>End time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isSaving} className="flex-1">
              {isSaving ? "Saving..." : isEditing ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
