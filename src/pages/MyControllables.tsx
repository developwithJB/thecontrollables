import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  CheckCircle2,
  Clipboard,
  Lock,
  MapPin,
  RotateCcw,
  Share2,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import type { ControllableType } from "@/components/ControllableCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { useControllableLevels } from "@/hooks/useControllableLevels";
import { useMyControllablesProfile } from "@/hooks/useMyControllablesProfile";
import { BOOK_CONTROLLABLES, getBookControllable } from "@/lib/bookWorld";
import { getLevelProgress } from "@/lib/controllableTheme";
import {
  EGO_PATTERNS,
  getEgoPattern,
  getProofShareText,
  type EgoPatternId,
  type ProofVisibility,
  type StartingReadAnswers,
} from "@/lib/myControllables";
import { cn } from "@/lib/utils";

const visibilityCopy: Record<ProofVisibility, { label: string; description: string }> = {
  private: {
    label: "Private",
    description: "Only your device shows local proof.",
  },
  anonymous: {
    label: "Anonymous",
    description: "Boards count your contribution without your name.",
  },
  public: {
    label: "Public handle",
    description: "Boards can show your handle with milestone proof.",
  },
};

export default function MyControllables() {
  usePageViewTracking("My Controllables");
  const user = useLifeOSUser();
  const { toast } = useToast();
  const {
    profile,
    stats,
    dailyPlan,
    proofCards,
    localBoards,
    localChallenges,
    saveStartingRead,
    updateParticipation,
    logDailyTraining,
    joinChallenge,
    markResetComplete,
  } = useMyControllablesProfile(user.id);
  const { data: persistedLevels = [] } = useControllableLevels(user.id);
  const dailyGuide = getBookControllable(dailyPlan.controllable);
  const ego = profile.assessment ? getEgoPattern(profile.assessment.egoPattern) : EGO_PATTERNS[0];
  const [dailyPromise, setDailyPromise] = useState(dailyPlan.promise);
  const [answers, setAnswers] = useState<StartingReadAnswers>(() => ({
    strongest: profile.assessment?.strongest ?? "awareness",
    growth: profile.assessment?.growth ?? "habit",
    egoPattern: profile.assessment?.egoPattern ?? "all_or_nothing",
    avoidedPromise: profile.assessment?.avoidedPromise ?? "",
    releaseGrip: profile.assessment?.releaseGrip ?? "",
    resetVision: profile.assessment?.resetVision ?? "",
  }));

  const strongest = profile.assessment ? getBookControllable(profile.assessment.strongest) : null;
  const growth = profile.assessment ? getBookControllable(profile.assessment.growth) : null;

  useEffect(() => {
    if (!stats.todayEntry) setDailyPromise(dailyPlan.promise);
  }, [dailyPlan.promise, stats.todayEntry]);

  const localXpByControllable = useMemo(() => {
    const xp: Partial<Record<ControllableType, number>> = {};
    for (const entry of profile.proofEntries) {
      xp[entry.controllable] = (xp[entry.controllable] ?? 0) + entry.xp;
    }
    return xp;
  }, [profile.proofEntries]);

  const handleSaveStartingRead = () => {
    saveStartingRead(answers);
    toast({
      title: "Starting Read saved",
      description: "Your My Controllables profile is private by default.",
    });
  };

  const handleDailyLog = (kind: "kept_promise" | "recovery_win") => {
    const entry = logDailyTraining({
      controllable: dailyPlan.controllable,
      promise: dailyPromise.trim() || dailyPlan.promise,
      kind,
    });

    toast({
      title: kind === "recovery_win" ? "Recovery win logged" : "Kept promise logged",
      description: `+${entry.xp} Self-Trust through ${dailyGuide.name}.`,
    });
  };

  const handleShare = async (cardIndex: number) => {
    const card = proofCards[cardIndex];
    if (!card.unlocked) return;

    const text = getProofShareText(profile, card);
    try {
      if (navigator.share) {
        await navigator.share({ title: card.title, text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      toast({ title: "Proof card ready", description: "Milestone copy is ready to share." });
    } catch {
      toast({ title: "Share cancelled", description: "Your private work stayed private." });
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24">
      <section className="rounded-2xl border border-border/60 bg-card px-5 py-6 shadow-sm md:px-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge variant="secondary" className="w-fit text-[11px] uppercase tracking-[0.16em]">
              My Controllables
            </Badge>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                Private growth first. Public proof only when you choose it.
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                Track the five Controllables, build Self-Trust through kept promises and recovery wins, then share milestones without exposing your reflections, wellness, money, calendar, journal, or AI guidance.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px]">
            <StatTile label="Self-Trust" value={`Level ${stats.level}`} detail={`${stats.totalXp} XP`} />
            <StatTile label="Promises" value={stats.keptPromises.toString()} detail="kept" />
            <StatTile label="Recovery" value={stats.recoveryWins.toString()} detail="wins" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="space-y-6">
          <ProfilePanel
            strongest={strongest}
            growth={growth}
            egoLabel={ego.label}
            stats={stats}
            city={profile.participation.city}
            state={profile.participation.state}
            visibility={profile.participation.visibility}
          />

          <ControllableLevelPanel
            persistedLevels={persistedLevels}
            localXpByControllable={localXpByControllable}
          />

          <DailyTrainingPanel
            dailyGuide={dailyGuide}
            promise={dailyPromise}
            onPromiseChange={setDailyPromise}
            todayLogged={Boolean(stats.todayEntry)}
            recoveryAvailable={stats.recoveryAvailable}
            onLogKeptPromise={() => handleDailyLog("kept_promise")}
            onLogRecovery={() => handleDailyLog("recovery_win")}
          />

          <LocalOptInPanel
            city={profile.participation.city}
            state={profile.participation.state}
            handle={profile.participation.handle}
            visibility={profile.participation.visibility}
            onUpdate={updateParticipation}
          />
        </section>

        <section className="space-y-6">
          <StartingReadPanel answers={answers} onAnswersChange={setAnswers} onSave={handleSaveStartingRead} />

          <section className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Proof Cards</h2>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Share the milestone, not the private work.
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={markResetComplete}>
                <Trophy className="h-4 w-4" />
                Mark reset done
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {proofCards.map((card, index) => (
                <div
                  key={card.id}
                  className={cn(
                    "rounded-xl border px-3 py-3",
                    card.unlocked ? "border-primary/20 bg-primary/5" : "border-border/50 bg-background/60 opacity-75",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {card.eyebrow}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-foreground">{card.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.body}</p>
                    </div>
                    {card.unlocked ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                  <Button
                    variant={card.unlocked ? "secondary" : "ghost"}
                    size="sm"
                    className="mt-3 w-full gap-2"
                    disabled={!card.unlocked}
                    onClick={() => handleShare(index)}
                  >
                    <Share2 className="h-4 w-4" />
                    Share milestone
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm md:px-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Local Boards</h2>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Weekly practice stats reset so new people can enter the loop.
              </p>
            </div>
            <Badge variant="outline" className="text-[11px]">
              Aggregated first
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {localBoards.map((board) => (
              <div key={board.id} className="rounded-xl border border-border/50 bg-background/60 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {board.label}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-foreground">{board.scope}</h3>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    +{board.yourContribution} yours
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <MiniMetric label="Promises" value={board.weeklyKeptPromises} />
                  <MiniMetric label="Recovery" value={board.recoveryWins} />
                  <MiniMetric label="Resets" value={board.resetCompletions} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Most improved this week: <span className="font-medium text-foreground">{board.mostImproved}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm md:px-5">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Local Challenges</h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Practice-based competition, never worth-based comparison.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {localChallenges.map((challenge) => {
              const joined = profile.joinedChallengeIds.includes(challenge.id);
              return (
                <div key={challenge.id} className="rounded-xl border border-border/50 bg-background/60 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {challenge.scope} - {challenge.days} days
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-foreground">{challenge.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{challenge.practice}</p>
                    </div>
                    {joined ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : null}
                  </div>
                  <Button
                    variant={joined ? "secondary" : "outline"}
                    size="sm"
                    className="mt-3 w-full gap-2"
                    onClick={() => joinChallenge(challenge.id)}
                    disabled={joined}
                  >
                    <Clipboard className="h-4 w-4" />
                    {joined ? "Joined" : "Join challenge"}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      </section>

      <footer className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Privacy boundary</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Local proof never exposes reflections, wellness, money, calendar, journal, or AI guidance. Boards only use opted-in milestone and practice totals.
              </p>
            </div>
          </div>
          <Link to="/proof">
            <Button variant="outline" className="w-full gap-2 md:w-auto">
              Open Proof
              <Award className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </footer>
    </div>
  );
}

function ProfilePanel({
  strongest,
  growth,
  egoLabel,
  stats,
  city,
  state,
  visibility,
}: {
  strongest: ReturnType<typeof getBookControllable> | null;
  growth: ReturnType<typeof getBookControllable> | null;
  egoLabel: string;
  stats: { level: number; levelProgress: number; keptPromises: number; recoveryWins: number; questsCompleted: number };
  city: string;
  state: string;
  visibility: ProofVisibility;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        </div>
        <Badge variant={visibility === "private" ? "outline" : "secondary"} className="text-[11px]">
          {visibilityCopy[visibility].label}
        </Badge>
      </div>

      <div className="rounded-xl border border-border/50 bg-background/60 px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">Self-Trust Level {stats.level}</p>
          <p className="text-xs font-medium text-muted-foreground">{stats.levelProgress}/100 XP</p>
        </div>
        <Progress value={stats.levelProgress} className="h-2 bg-muted/60" />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <ProfileFact label="Strongest" value={strongest ? `${strongest.emoji} ${strongest.name}` : "Take the Starting Read"} />
        <ProfileFact label="Training Focus" value={growth ? `${growth.emoji} ${growth.name}` : "Awaiting read"} />
        <ProfileFact label="Ego Pattern" value={egoLabel} />
        <ProfileFact label="Local" value={city || state ? [city, state].filter(Boolean).join(", ") : "Not shared"} />
        <ProfileFact label="Kept Promises" value={stats.keptPromises.toString()} />
        <ProfileFact label="Recovery Wins" value={stats.recoveryWins.toString()} />
        <ProfileFact label="Quests Complete" value={stats.questsCompleted.toString()} />
      </div>
    </section>
  );
}

function ControllableLevelPanel({
  persistedLevels,
  localXpByControllable,
}: {
  persistedLevels: { type: ControllableType; totalXp: number; level: number; progress: number }[];
  localXpByControllable: Partial<Record<ControllableType, number>>;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">5 Controllable Levels</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            App XP plus local proof reps.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {BOOK_CONTROLLABLES.map((controllable) => {
          const persisted = persistedLevels.find((level) => level.type === controllable.id);
          const localXp = localXpByControllable[controllable.id] ?? 0;
          const totalXp = (persisted?.totalXp ?? 0) + localXp;
          const level = getLevelProgress(totalXp);
          const progress = Math.max(0, Math.min(level.progress * 100, 100));

          return (
            <div key={controllable.id} className="rounded-xl border border-border/50 bg-background/60 px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden="true">
                    {controllable.emoji}
                  </span>
                  <p className={cn("text-sm font-semibold", controllable.classes.textClass)}>
                    {controllable.name}
                  </p>
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  Level {level.level}
                </p>
              </div>
              <Progress value={progress} className="h-2 bg-muted/60" />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {totalXp} XP total {localXp > 0 ? `- ${localXp} from local proof` : ""}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StartingReadPanel({
  answers,
  onAnswersChange,
  onSave,
}: {
  answers: StartingReadAnswers;
  onAnswersChange: (answers: StartingReadAnswers) => void;
  onSave: () => void;
}) {
  const update = <K extends keyof StartingReadAnswers>(key: K, value: StartingReadAnswers[K]) => {
    onAnswersChange({ ...answers, [key]: value });
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.16em]">
            60-Second Starting Read
          </Badge>
          <h2 className="mt-2 text-sm font-semibold text-foreground">Create your first My Controllables read.</h2>
        </div>
        <UserRound className="h-5 w-5 text-primary" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Strongest"
          value={answers.strongest}
          onChange={(value) => update("strongest", value as ControllableType)}
          options={BOOK_CONTROLLABLES.map((item) => ({ value: item.id, label: `${item.emoji} ${item.name}` }))}
        />
        <SelectField
          label="Needs training"
          value={answers.growth}
          onChange={(value) => update("growth", value as ControllableType)}
          options={BOOK_CONTROLLABLES.map((item) => ({ value: item.id, label: `${item.emoji} ${item.name}` }))}
        />
        <SelectField
          label="Ego pattern"
          value={answers.egoPattern}
          onChange={(value) => update("egoPattern", value as EgoPatternId)}
          options={EGO_PATTERNS.map((item) => ({ value: item.id, label: item.label }))}
        />
      </div>

      <div className="mt-3 space-y-3">
        <Textarea
          value={answers.avoidedPromise}
          onChange={(event) => update("avoidedPromise", event.target.value.slice(0, 160))}
          className="min-h-[64px] resize-none text-sm"
          placeholder="What promise have I been avoiding?"
          maxLength={160}
        />
        <Textarea
          value={answers.releaseGrip}
          onChange={(event) => update("releaseGrip", event.target.value.slice(0, 160))}
          className="min-h-[64px] resize-none text-sm"
          placeholder="What am I trying to control that I may need to release?"
          maxLength={160}
        />
        <Textarea
          value={answers.resetVision}
          onChange={(event) => update("resetVision", event.target.value.slice(0, 160))}
          className="min-h-[64px] resize-none text-sm"
          placeholder="What would a 7-day reset look like?"
          maxLength={160}
        />
        <Button onClick={onSave} className="w-full gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Save Starting Read
        </Button>
      </div>
    </section>
  );
}

function DailyTrainingPanel({
  dailyGuide,
  promise,
  todayLogged,
  recoveryAvailable,
  onPromiseChange,
  onLogKeptPromise,
  onLogRecovery,
}: {
  dailyGuide: ReturnType<typeof getBookControllable>;
  promise: string;
  todayLogged: boolean;
  recoveryAvailable: boolean;
  onPromiseChange: (value: string) => void;
  onLogKeptPromise: () => void;
  onLogRecovery: () => void;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Daily Training</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">Train {dailyGuide.name}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{dailyGuide.coreQuestion}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${dailyGuide.classes.bgClass}`}>
          <span className="text-lg" aria-hidden="true">{dailyGuide.emoji}</span>
        </div>
      </div>

      <Textarea
        value={promise}
        onChange={(event) => onPromiseChange(event.target.value.slice(0, 160))}
        className="min-h-[72px] resize-none text-sm"
        placeholder="One promise I can keep today..."
        maxLength={160}
        disabled={todayLogged}
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button onClick={onLogKeptPromise} disabled={todayLogged} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Log kept promise
        </Button>
        <Button onClick={onLogRecovery} disabled={todayLogged || !recoveryAvailable} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Recovery win
        </Button>
      </div>
    </section>
  );
}

function LocalOptInPanel({
  city,
  state,
  handle,
  visibility,
  onUpdate,
}: {
  city: string;
  state: string;
  handle: string;
  visibility: ProofVisibility;
  onUpdate: (value: { city?: string; state?: string; handle?: string; visibility?: ProofVisibility }) => void;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Local Opt-In</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">City and state are optional.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input value={city} onChange={(event) => onUpdate({ city: event.target.value.slice(0, 60) })} placeholder="City" />
        <Input value={state} onChange={(event) => onUpdate({ state: event.target.value.slice(0, 40) })} placeholder="State" />
      </div>
      <Input
        value={handle}
        onChange={(event) => onUpdate({ handle: event.target.value.slice(0, 32) })}
        placeholder="Public handle (optional)"
        className="mt-3"
      />

      <div className="mt-3 grid gap-2">
        {(Object.keys(visibilityCopy) as ProofVisibility[]).map((option) => (
          <button
            key={option}
            onClick={() => onUpdate({ visibility: option })}
            className={cn(
              "rounded-xl border px-3 py-3 text-left transition-colors",
              visibility === option ? "border-primary/30 bg-primary/5" : "border-border/50 bg-background/60 hover:bg-muted/50",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{visibilityCopy[option].label}</p>
              {visibility === option ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{visibilityCopy[option].description}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/70 px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/60 px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/60 px-2 py-2">
      <p className="text-sm font-semibold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
