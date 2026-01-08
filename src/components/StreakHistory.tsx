import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, Grid, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday,
  parseISO,
} from "date-fns";

interface CheckIn {
  id: string;
  check_in_date: string;
  completed: boolean;
  daily_focus: string | null;
}

interface StreakHistoryProps {
  checkIns: CheckIn[];
  onDaySelect?: (date: Date, checkIn: CheckIn | null) => void;
}

type ViewMode = "month" | "week" | "day";

export function StreakHistory({ checkIns, onDaySelect }: StreakHistoryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const checkInMap = useMemo(() => {
    const map = new Map<string, CheckIn>();
    checkIns.forEach((c) => {
      map.set(c.check_in_date, c);
    });
    return map;
  }, [checkIns]);

  const getCheckInForDate = (date: Date): CheckIn | null => {
    const dateStr = format(date, "yyyy-MM-dd");
    return checkInMap.get(dateStr) || null;
  };

  const handlePrev = () => {
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const checkIn = getCheckInForDate(date);
    onDaySelect?.(date, checkIn);
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const checkIn = getCheckInForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <motion.button
                key={i}
                className={cn(
                  "aspect-square rounded-lg flex items-center justify-center relative transition-all",
                  !isCurrentMonth && "opacity-30",
                  isSelected && "ring-2 ring-accent ring-offset-2 ring-offset-background",
                  isTodayDate && !isSelected && "ring-1 ring-foreground/20",
                  checkIn?.completed ? "bg-accent/20 hover:bg-accent/30" : "hover:bg-muted",
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleDayClick(day)}
              >
                <span className={cn("text-sm font-medium", checkIn?.completed ? "text-accent" : "text-foreground")}>
                  {format(day, "d")}
                </span>
                {checkIn?.completed && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, i) => {
            const checkIn = getCheckInForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <motion.button
                key={i}
                className={cn(
                  "p-3 rounded-xl flex flex-col items-center gap-2 transition-all",
                  isSelected && "ring-2 ring-accent ring-offset-2 ring-offset-background",
                  isTodayDate && !isSelected && "ring-1 ring-foreground/20",
                  checkIn?.completed ? "bg-accent/20 hover:bg-accent/30" : "bg-card hover:bg-muted",
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleDayClick(day)}
              >
                <span className="text-xs text-muted-foreground">{format(day, "EEE")}</span>
                <span className={cn("text-lg font-bold", checkIn?.completed ? "text-accent" : "text-foreground")}>
                  {format(day, "d")}
                </span>
                {checkIn?.completed && <div className="w-2 h-2 rounded-full bg-accent" />}
              </motion.button>
            );
          })}
        </div>

        {selectedDate && <DayDetail date={selectedDate} checkIn={getCheckInForDate(selectedDate)} />}
      </div>
    );
  };

  const renderDayView = () => {
    const displayDate = selectedDate || currentDate;
    const checkIn = getCheckInForDate(displayDate);

    return (
      <DayDetail
        date={displayDate}
        checkIn={checkIn}
        onSelectPrev={() => {
          const prevDay = new Date(displayDate);
          prevDay.setDate(prevDay.getDate() - 1);
          setSelectedDate(prevDay);
        }}
        onSelectNext={() => {
          const nextDay = new Date(displayDate);
          nextDay.setDate(nextDay.getDate() + 1);
          setSelectedDate(nextDay);
        }}
      />
    );
  };

  return (
    <motion.div
      className="p-6 rounded-xl bg-card border shadow-soft"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-accent" />
          <h2 className="font-display text-lg font-semibold text-foreground">Streak History</h2>
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="month" className="gap-1 text-xs">
              <Grid className="w-3 h-3" />
              Month
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-1 text-xs">
              <LayoutList className="w-3 h-3" />
              Week
            </TabsTrigger>
            <TabsTrigger value="day" className="gap-1 text-xs">
              <Calendar className="w-3 h-3" />
              Day
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={handlePrev}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-display font-medium text-foreground">
          {viewMode === "month"
            ? format(currentDate, "MMMM yyyy")
            : viewMode === "week"
              ? `Week of ${format(startOfWeek(currentDate), "MMM d")}`
              : selectedDate
                ? format(selectedDate, "MMMM d, yyyy")
                : format(currentDate, "MMMM d, yyyy")}
        </h3>
        <Button variant="ghost" size="icon" onClick={handleNext}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {viewMode === "month" && renderMonthView()}
      {viewMode === "week" && renderWeekView()}
      {viewMode === "day" && renderDayView()}

      {viewMode === "month" && selectedDate && (
        <motion.div
          className="mt-4 pt-4 border-t"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <DayDetail date={selectedDate} checkIn={getCheckInForDate(selectedDate)} />
        </motion.div>
      )}
    </motion.div>
  );
}

interface DayDetailProps {
  date: Date;
  checkIn: CheckIn | null;
  onSelectPrev?: () => void;
  onSelectNext?: () => void;
}

function DayDetail({ date, checkIn, onSelectPrev, onSelectNext }: DayDetailProps) {
  const isTodayDate = isToday(date);

  return (
    <div className="space-y-3">
      {(onSelectPrev || onSelectNext) && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onSelectPrev}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <Button variant="ghost" size="sm" onClick={onSelectNext}>
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      <div className="p-4 rounded-lg bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display font-semibold text-foreground">{format(date, "EEEE, MMMM d")}</span>
          {isTodayDate && (
            <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">Today</span>
          )}
        </div>

        {checkIn?.completed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-sm text-accent font-medium">Checked in</span>
            </div>
            {checkIn.daily_focus && (
              <div className="pl-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Focus: </span>
                  {checkIn.daily_focus}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
            <span className="text-sm text-muted-foreground">No check-in</span>
          </div>
        )}
      </div>
    </div>
  );
}
