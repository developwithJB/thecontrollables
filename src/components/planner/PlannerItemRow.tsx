import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  SkipForward,
  GripVertical,
  Calendar,
  Zap,
  MoreHorizontal,
  Pencil,
  Trash2,
  CalendarClock,
} from "lucide-react";
import type { PlannerItem, PlannerItemStatus } from "@/hooks/usePlanner";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const statusIcon: Record<PlannerItemStatus, React.ReactNode> = {
  todo: <Circle className="h-5 w-5 text-muted-foreground" />,
  in_progress: <Loader2 className="h-5 w-5 text-accent animate-spin" />,
  done: <CheckCircle2 className="h-5 w-5 text-perspective" />,
  skipped: <SkipForward className="h-5 w-5 text-muted-foreground/50" />,
};

const energyColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-awareness/20 text-awareness-foreground",
  high: "bg-destructive/20 text-destructive",
};

const typeIcons: Record<string, React.ReactNode> = {
  time_block: <Clock className="h-3 w-3" />,
  routine_instance: <CalendarClock className="h-3 w-3" />,
  external_event: <Calendar className="h-3 w-3" />,
};

interface PlannerItemRowProps {
  item: PlannerItem;
  onToggleStatus: (item: PlannerItem) => void;
  onEdit: (item: PlannerItem) => void;
  onDelete: (id: string) => void;
  onReschedule: (item: PlannerItem) => void;
  dragEnabled?: boolean;
}

export const PlannerItemRow = ({
  item,
  onToggleStatus,
  onEdit,
  onDelete,
  onReschedule,
  dragEnabled = true,
}: PlannerItemRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !dragEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDone = item.status === "done";
  const isSkipped = item.status === "skipped";
  const isExternal = item.item_type === "external_event";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card transition-all group",
        isDragging && "opacity-50 shadow-lg z-50",
        (isDone || isSkipped) && "opacity-60"
      )}
    >
      {dragEnabled && (
        <button
          {...attributes}
          {...listeners}
          className="touch-none text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <button
        onClick={() => onToggleStatus(item)}
        className="shrink-0"
        disabled={isExternal}
      >
        {statusIcon[item.status]}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {item.item_type !== "task" && (
            <span className="text-muted-foreground">
              {typeIcons[item.item_type]}
            </span>
          )}
          <span
            className={cn(
              "text-sm font-medium truncate",
              isDone && "line-through text-muted-foreground",
              isSkipped && "line-through text-muted-foreground/50"
            )}
          >
            {item.title}
          </span>
        </div>

        {(item.start_time || item.energy_level) && (
          <div className="flex items-center gap-2 mt-0.5">
            {item.start_time && (
              <span className="text-xs text-muted-foreground">
                {item.start_time.slice(0, 5)}
                {item.end_time && ` – ${item.end_time.slice(0, 5)}`}
              </span>
            )}
            {item.energy_level && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5",
                  energyColors[item.energy_level]
                )}
              >
                <Zap className="h-2.5 w-2.5" />
                {item.energy_level}
              </span>
            )}
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(item)}>
            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onReschedule(item)}>
            <CalendarClock className="h-3.5 w-3.5 mr-2" /> Reschedule
          </DropdownMenuItem>
          {!isExternal && (
            <DropdownMenuItem
              onClick={() => onDelete(item.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
