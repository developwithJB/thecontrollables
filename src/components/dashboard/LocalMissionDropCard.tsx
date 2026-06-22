import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Copy, MapPin, Play, ShieldCheck, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InfoHint } from "@/components/ui/info-hint";
import { Input } from "@/components/ui/input";
import { FuturePanel } from "@/components/ui/future";
import { useToast } from "@/hooks/use-toast";
import { useLocalMissionDrop } from "@/hooks/useLocalMissionDrop";
import { getBookControllable } from "@/lib/bookWorld";
import type { LocalMissionVisibility } from "@/lib/localMissionDrop";
import { cn } from "@/lib/utils";
import { PhotoProofCapture } from "@/components/dashboard/PhotoProofCapture";
import { Link } from "react-router-dom";
import { useControllablesDex } from "@/hooks/useControllablesDex";

interface LocalMissionDropCardProps {
  userId: string | null;
}

const visibilityOptions: { value: LocalMissionVisibility; label: string; description: string }[] = [
  { value: "private", label: "Private", description: "Only you see local progress." },
  { value: "anonymous", label: "Anonymous", description: "Future boards can count you without a handle." },
  { value: "public", label: "Public", description: "Share cards can show your city if you allow it." },
];

export function LocalMissionDropCard({ userId }: LocalMissionDropCardProps) {
  const { toast } = useToast();
  const {
    preferences,
    mission,
    isMissionStarted,
    proofCopy,
    updatePreferences,
    enableLocalMissions,
    startMission,
    dismissPhotoProof,
    completeMission,
    isPhotoProofDismissed,
  } = useLocalMissionDrop(userId);
  const { entries: dexEntries } = useControllablesDex(userId);
  const [city, setCity] = useState(preferences.city);
  const [state, setState] = useState(preferences.state);
  const [visibility, setVisibility] = useState<LocalMissionVisibility>(preferences.localMissionVisibility);
  const [showPhotoProofCapture, setShowPhotoProofCapture] = useState(false);
  const [photoProofSaved, setPhotoProofSaved] = useState(false);
  const hasDexProofForMission = mission ? dexEntries.some((entry) => entry.missionId === mission.id) : false;

  useEffect(() => {
    setCity(preferences.city);
    setState(preferences.state);
    setVisibility(preferences.localMissionVisibility);
  }, [preferences.city, preferences.localMissionVisibility, preferences.state]);

  useEffect(() => {
    setShowPhotoProofCapture(false);
    setPhotoProofSaved(false);
  }, [mission?.id]);

  if (!preferences.localMissionsEnabled) {
    const canEnable = Boolean(city.trim() || state.trim());

    return (
      <FuturePanel className="px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="future-icon-frame h-10 w-10">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.16em]">
                Today's Mission Drop
              </Badge>
              <div className="mt-2 flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">Turn on Local Missions?</h2>
                <InfoHint title="Local Missions">
                  Get missions shaped by your city, weather, and community. City/state only. No exact location.
                </InfoHint>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Input className="future-input" value={city} onChange={(event) => setCity(event.target.value.slice(0, 60))} placeholder="City" />
              <Input className="future-input" value={state} onChange={(event) => setState(event.target.value.slice(0, 40))} placeholder="State" />
            </div>

            <div className="grid gap-2">
              {visibilityOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors",
                    visibility === option.value
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/50 bg-background/60 hover:bg-muted/50",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setVisibility(option.value)}
                    className="min-w-0 flex-1 text-left text-sm font-medium text-foreground"
                  >
                    {option.label}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <InfoHint title={`${option.label} visibility`} className="h-6 w-6">
                      {option.description}
                    </InfoHint>
                    {visibility === option.value ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="future"
              className="w-full gap-2"
              disabled={!canEnable}
              onClick={() => {
                enableLocalMissions({
                  city: city.trim(),
                  state: state.trim(),
                  localMissionVisibility: visibility,
                });
                toast({
                  title: "Local Missions enabled",
                  description: "City/state only. No exact location.",
                });
              }}
            >
              <MapPin className="h-4 w-4" />
              Enable Local Missions
            </Button>
          </div>
        </div>
      </FuturePanel>
    );
  }

  if (!mission) return null;

  const guide = getBookControllable(mission.targetControllable);
  const locationLabel = [mission.city, mission.state].filter(Boolean).join(", ") || "City/state level";
  const showCityToggleDisabled = preferences.localMissionVisibility !== "public";

  const handleMissionCta = () => {
    if (!isMissionStarted) {
      startMission(mission.id);
      toast({
        title: "Local Mission started",
        description: mission.instruction,
      });
      return;
    }

    const result = completeMission(mission);
    toast({
      title: result.alreadyCompleted ? "Local Mission already complete" : "Local Mission complete",
      description: result.alreadyCompleted
        ? "Today's local proof was already counted."
        : `+${result.xpAwarded} ${guide.name} XP and +${result.selfTrustAwarded} Self-Trust.`,
    });

    if (!result.alreadyCompleted) {
      setShowPhotoProofCapture(false);
      setPhotoProofSaved(false);
    }
  };

  const copyProof = async () => {
    if (!proofCopy) return;

    try {
      await navigator.clipboard.writeText(`${proofCopy.title}\n${proofCopy.body}`);
      toast({ title: "Local proof copied", description: "Safe share copy is ready." });
    } catch {
      toast({ title: "Copy unavailable", description: "Your local proof stayed private." });
    }
  };

  return (
    <FuturePanel className="px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.16em]">
            Today's Mission Drop
          </Badge>
          <h2 className="text-base font-semibold text-foreground">{mission.title}</h2>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {locationLabel}
          </p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/10 ${guide.classes.bgClass}`}>
          <span className="text-xl" aria-hidden="true">
            {guide.emoji}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border/50 bg-background/60 px-3 py-3">
        <p className={cn("text-xs font-medium uppercase tracking-[0.16em]", guide.classes.textClass)}>
          Charge {guide.name}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-sm font-medium leading-relaxed text-foreground">{mission.instruction}</p>
          <InfoHint title="Why this mission" className="h-7 w-7">
            {mission.shortWhy}
          </InfoHint>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1 text-[11px]">
          <Zap className="h-3 w-3" />
          +{mission.xpReward} XP
        </Badge>
        <Badge variant="outline" className="gap-1 text-[11px]">
          <Clock3 className="h-3 w-3" />
          {mission.estimatedMinutes} min
        </Badge>
        <Badge variant={preferences.localMissionVisibility === "private" ? "outline" : "secondary"} className="text-[11px]">
          {preferences.localMissionVisibility}
        </Badge>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button variant="future" onClick={handleMissionCta} disabled={mission.completed} className="gap-2">
          {mission.completed ? <CheckCircle2 className="h-4 w-4" /> : isMissionStarted ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {mission.completed ? "Completed" : isMissionStarted ? "Complete" : "Start"}
        </Button>
        <Button variant="futureOutline" onClick={copyProof} disabled={!mission.completed || !proofCopy} className="gap-2">
          <Copy className="h-4 w-4" />
          Copy proof
        </Button>
      </div>

      {mission.completed && !showPhotoProofCapture && !isPhotoProofDismissed && !photoProofSaved && !hasDexProofForMission ? (
        <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Add this to your Proof Loop?</p>
              <InfoHint title="Proof Loop" className="mt-1 h-7 w-7">
                Add one private photo as proof of the real-life mission.
              </InfoHint>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="future" size="sm" onClick={() => setShowPhotoProofCapture(true)}>
                Add Proof
              </Button>
              <Button size="sm" variant="ghost" onClick={() => dismissPhotoProof(mission.id)}>
                Skip
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showPhotoProofCapture ? (
        <div className="mt-3">
          <PhotoProofCapture
            userId={userId}
            missionId={mission.id}
            targetControllable={mission.targetControllable}
            city={mission.city}
            state={mission.state}
            visibility="private"
            onSaved={() => {
              setShowPhotoProofCapture(false);
              setPhotoProofSaved(true);
            }}
            onSkip={() => {
              setShowPhotoProofCapture(false);
              dismissPhotoProof(mission.id);
            }}
          />
        </div>
      ) : null}

      {photoProofSaved || hasDexProofForMission ? (
        <div className="mt-3 rounded-xl border border-border/50 bg-background/60 px-3 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-foreground">Proof saved.</p>
              <InfoHint title="Proof saved">
                Photo proof saved privately to The Controllables Dex.
              </InfoHint>
            </div>
            <Button asChild size="sm" variant="futureOutline">
              <Link to="/proof/dex">
                Open Dex
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 rounded-xl border border-border/50 bg-background/60 px-3 py-3">
        <div className="flex items-start gap-2">
          <Checkbox
            checked={preferences.showCityOnShareCards}
            disabled={showCityToggleDisabled}
            onCheckedChange={(checked) => updatePreferences({ showCityOnShareCards: checked === true })}
          />
          <span className="min-w-0 text-xs text-muted-foreground">
            <span className="block font-medium text-foreground">Show city on share cards</span>
            <InfoHint title="City share rules" className="mt-1 h-6 w-6">
              City/state only appears when public visibility and this setting are both on.
            </InfoHint>
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Privacy-safe</span>
        <InfoHint title="Local privacy" className="h-6 w-6">
          No exact location. No maps. No private reflections.
        </InfoHint>
      </div>
    </FuturePanel>
  );
}
