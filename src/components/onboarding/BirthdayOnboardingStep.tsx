import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { CalendarDays, ShieldCheck, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";

interface BirthdayOnboardingStepProps {
  birthday: string;
  onBirthdayChange: (value: string) => void;
}

interface BirthdayParts {
  month: string;
  day: string;
  year: string;
}

const EMPTY_BIRTHDAY: BirthdayParts = { month: "", day: "", year: "" };

function sanitizeDigits(value: string, maxLength: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function getBirthdayParts(value: string): BirthdayParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return EMPTY_BIRTHDAY;
  return { year: match[1], month: match[2], day: match[3] };
}

function buildBirthdayIso(parts: BirthdayParts): string | null {
  if (parts.month.length !== 2 || parts.day.length !== 2 || parts.year.length !== 4) {
    return null;
  }

  const month = Number(parts.month);
  const day = Number(parts.day);
  const year = Number(parts.year);
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!isRealDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return null;

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatBirthdayPreview(value: string | null): string {
  if (!value) return "MM / DD / YYYY";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function BirthdayOnboardingStep({
  birthday,
  onBirthdayChange,
}: BirthdayOnboardingStepProps) {
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const [parts, setParts] = useState<BirthdayParts>(() => getBirthdayParts(birthday));

  useEffect(() => {
    if (birthday) {
      setParts(getBirthdayParts(birthday));
    }
  }, [birthday]);

  const selectedDate = useMemo(() => buildBirthdayIso(parts), [parts]);
  const hasStarted = Boolean(parts.month || parts.day || parts.year);
  const isComplete = parts.month.length === 2 && parts.day.length === 2 && parts.year.length === 4;
  const showError = hasStarted && isComplete && !selectedDate;

  const updatePart = (
    part: keyof BirthdayParts,
    value: string,
    maxLength: number,
    nextInput?: RefObject<HTMLInputElement>,
  ) => {
    const cleanValue = sanitizeDigits(value, maxLength);
    setParts((current) => {
      const next = { ...current, [part]: cleanValue };
      onBirthdayChange(buildBirthdayIso(next) ?? "");
      return next;
    });

    if (cleanValue.length === maxLength) {
      nextInput?.current?.focus();
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/10 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.22),transparent_42%)]" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-background/60">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Starting Charge
            </p>
            <h1 className="mt-1 font-display text-xl font-semibold leading-tight text-foreground">
              Start with your birthday
            </h1>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-background/55 p-3 shadow-[0_18px_60px_-36px_hsl(var(--primary)/0.6)] backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <Label className="text-sm font-semibold text-foreground">Birthday</Label>
            <p className="mt-1 text-xs text-muted-foreground">No calendar picker.</p>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Private
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr_auto_1.35fr] items-end gap-2" aria-label="Birthday date fields">
          <div className="space-y-2">
            <label htmlFor="birthday-month" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Month
            </label>
            <input
              ref={monthRef}
              id="birthday-month"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="bday-month"
              placeholder="MM"
              value={parts.month}
              onChange={(event) => updatePart("month", event.target.value, 2, dayRef)}
              aria-invalid={showError}
              className="h-14 w-full rounded-xl border border-border/70 bg-card/80 px-2 text-center font-mono text-xl font-semibold text-foreground shadow-inner outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <span className="pb-4 text-lg font-semibold text-muted-foreground">/</span>
          <div className="space-y-2">
            <label htmlFor="birthday-day" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Day
            </label>
            <input
              ref={dayRef}
              id="birthday-day"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="bday-day"
              placeholder="DD"
              value={parts.day}
              onChange={(event) => updatePart("day", event.target.value, 2, yearRef)}
              aria-invalid={showError}
              className="h-14 w-full rounded-xl border border-border/70 bg-card/80 px-2 text-center font-mono text-xl font-semibold text-foreground shadow-inner outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <span className="pb-4 text-lg font-semibold text-muted-foreground">/</span>
          <div className="space-y-2">
            <label htmlFor="birthday-year" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Year
            </label>
            <input
              ref={yearRef}
              id="birthday-year"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="bday-year"
              placeholder="YYYY"
              value={parts.year}
              onChange={(event) => updatePart("year", event.target.value, 4)}
              aria-invalid={showError}
              className="h-14 w-full rounded-xl border border-border/70 bg-card/80 px-2 text-center font-mono text-xl font-semibold text-foreground shadow-inner outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-sm font-semibold text-foreground">
              {formatBirthdayPreview(selectedDate)}
            </p>
            {selectedDate ? (
              <Sparkles className="h-4 w-4 text-primary" />
            ) : null}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: selectedDate ? "100%" : hasStarted ? "48%" : "18%" }}
            />
          </div>
        </div>

        {showError ? (
          <p className="mt-3 text-xs font-medium text-destructive">
            Enter a real past date in MM / DD / YYYY format.
          </p>
        ) : null}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          This stays on this device until you create an account.
        </p>
      </div>
    </div>
  );
}
