import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ControllableCard, type ControllableType } from "@/components/ControllableCard";
import type { ControllableFocus } from "@/hooks/useProjects";
import { CONTROLLABLE_LIST } from "@/lib/controllableTheme";

const SUGGESTIONS = [
  "New job / career move",
  "Health reset",
  "Building something new",
];

const CONTROLLABLE_DETAILS: { type: ControllableType; title: string; emoji: string; description: string }[] = [
  { type: "awareness", title: "Awareness", emoji: "🦉", description: "See yourself and your patterns clearly" },
  { type: "perspective", title: "Perspective", emoji: "🐢", description: "Reframe how you see challenges" },
  { type: "habit", title: "Habit", emoji: "🦈", description: "Build discipline through daily action" },
  { type: "wellness", title: "Wellness", emoji: "🛰️", description: "Protect your energy and recovery" },
  { type: "environment", title: "Environment", emoji: "🚀", description: "Design surroundings that support you" },
];

const PROJECT_EMOJIS = ["🎯", "💪", "📚", "🏃", "✍️", "🧘", "💼", "🎨", "🌱", "🔥", "🧠", "💡", "🏠", "🤝", "📈", "🎵", "🍎", "⚡", "🛠️", "🌟"];
const PROJECT_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#059669", "#f59e0b", "#f43f5e", "#8b5cf6", "#64748b"];

const THEME_PROJECT_SUGGESTIONS: Record<string, string> = {
  health: "Daily Movement",
  career: "Skill Building",
  building: "Ship Weekly",
  job: "Interview Prep",
  reset: "Morning Routine",
  new: "30-Day Challenge",
};

function suggestProjectName(theme: string): string {
  const lower = theme.toLowerCase();
  for (const [key, val] of Object.entries(THEME_PROJECT_SUGGESTIONS)) {
    if (lower.includes(key)) return val;
  }
  return "First Focus";
}

interface SeasonSetupProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onStartSeason: (params: {
    name: string;
    theme_text: string;
    controllable_focus: ControllableFocus;
  }) => Promise<string | null>;
  onCreateProject: (params: {
    user_id: string;
    name: string;
    emoji: string;
    color_hex: string;
    controllable: ControllableFocus;
    season_id: string;
  }) => Promise<any>;
}

export function SeasonSetup({ open, onClose, userId, onStartSeason, onCreateProject }: SeasonSetupProps) {
  const [step, setStep] = useState(0);
  const [seasonName, setSeasonName] = useState("");
  const [themeText, setThemeText] = useState("");
  const [controllableFocus, setControllableFocus] = useState<ControllableFocus | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectEmoji, setProjectEmoji] = useState("🎯");
  const [projectColor, setProjectColor] = useState("#6366f1");
  const [projectControllable, setProjectControllable] = useState<ControllableFocus | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-suggest project name when moving to step 3
  const goToStep = (s: number) => {
    if (s === 3 && !projectName) {
      setProjectName(suggestProjectName(themeText));
      if (controllableFocus && !projectControllable) setProjectControllable(controllableFocus);
    }
    setStep(s);
  };

  const canAdvance = [
    seasonName.trim().length > 0,
    themeText.trim().length > 0,
    controllableFocus !== null,
    projectName.trim().length > 0,
  ];

  const handleFinish = async () => {
    if (!controllableFocus) return;
    setIsSaving(true);
    try {
      const seasonId = await onStartSeason({
        name: seasonName.trim(),
        theme_text: themeText.trim(),
        controllable_focus: controllableFocus,
      });
      if (seasonId) {
        await onCreateProject({
          user_id: userId,
          name: projectName.trim(),
          emoji: projectEmoji,
          color_hex: projectColor,
          controllable: projectControllable || controllableFocus,
          season_id: seasonId,
        });
      }
      onClose();
    } catch {
      // errors handled upstream
    } finally {
      setIsSaving(false);
    }
  };

  const slideVariants = {
    enter: { x: 60, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -60, opacity: 0 },
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center pt-6 pb-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="px-6 pb-6 pt-2 min-h-[340px] flex flex-col"
          >
            {step === 0 && (
              <div className="flex-1 flex flex-col">
                <h2 className="font-display text-xl font-semibold text-foreground">What chapter of life are you in right now?</h2>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Give this season a name.</p>
                <Input
                  value={seasonName}
                  onChange={(e) => setSeasonName(e.target.value)}
                  placeholder="e.g. New City, New Start"
                  autoFocus
                  className="text-base"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setSeasonName(s)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 hover:bg-muted text-foreground transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="flex-1 flex flex-col">
                <h2 className="font-display text-xl font-semibold text-foreground">What do you most want to move forward in the next 90 days?</h2>
                <p className="text-sm text-muted-foreground mt-1 mb-4">This becomes your season's theme.</p>
                <Input
                  value={themeText}
                  onChange={(e) => setThemeText(e.target.value)}
                  placeholder="e.g. Get my energy and fitness back on track"
                  autoFocus
                  className="text-base"
                />
              </div>
            )}

            {step === 2 && (
              <div className="flex-1 flex flex-col">
                <h2 className="font-display text-xl font-semibold text-foreground">Which Controllable needs the most attention?</h2>
                <p className="text-sm text-muted-foreground mt-1 mb-3">Pick your primary focus area.</p>
                <div className="space-y-2 overflow-y-auto max-h-[280px]">
                  {CONTROLLABLE_DETAILS.map(c => (
                    <ControllableCard
                      key={c.type}
                      type={c.type}
                      title={c.title}
                      emoji={c.emoji}
                      description={c.description}
                      isActive={controllableFocus === c.type}
                      onClick={() => setControllableFocus(c.type as ControllableFocus)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex-1 flex flex-col">
                <h2 className="font-display text-xl font-semibold text-foreground">Create your first Project</h2>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Projects are intention containers within your season.</p>

                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name"
                  autoFocus
                  className="text-base mb-3"
                />

                {/* Emoji picker */}
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Icon</label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {PROJECT_EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => setProjectEmoji(e)}
                      className={`w-8 h-8 rounded-md flex items-center justify-center text-lg transition-all ${projectEmoji === e ? "bg-primary/15 ring-2 ring-primary" : "hover:bg-muted"}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>

                {/* Color picker */}
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Color</label>
                <div className="flex gap-2 mb-3">
                  {PROJECT_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setProjectColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${projectColor === c ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                {/* Controllable tag */}
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Controllable</label>
                <div className="flex flex-wrap gap-1.5">
                  {CONTROLLABLES.map(c => (
                    <button
                      key={c.type}
                      onClick={() => setProjectControllable(c.type as ControllableFocus)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${projectControllable === c.type ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      {c.emoji} {c.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-2 px-6 pb-6">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <Button size="sm" disabled={!canAdvance[step]} onClick={() => goToStep(step + 1)}>
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" disabled={!canAdvance[3] || isSaving} onClick={handleFinish}>
              {isSaving ? "Starting..." : <>Start this Season <Sparkles className="w-4 h-4 ml-1" /></>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
