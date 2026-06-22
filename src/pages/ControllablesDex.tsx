import { Link } from "react-router-dom";
import { Camera, Copy, LockKeyhole, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/ui/info-hint";
import { Progress } from "@/components/ui/progress";
import { FutureCard, FutureChip, FutureHero, FutureMetric, FuturePanel } from "@/components/ui/future";
import { useToast } from "@/hooks/use-toast";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { useControllablesDex } from "@/hooks/useControllablesDex";
import { getBookControllable } from "@/lib/bookWorld";
import { getDexShareText } from "@/lib/controllablesDex";
import { cn } from "@/lib/utils";

export default function ControllablesDex() {
  usePageViewTracking("Controllables Dex");
  const user = useLifeOSUser();
  const { toast } = useToast();
  const { stats, categories, recentEntries, deleteProofEntry } = useControllablesDex(user.id);

  const copyProof = async (entryId: string) => {
    const entry = recentEntries.find((candidate) => candidate.id === entryId);
    if (!entry) return;

    try {
      await navigator.clipboard.writeText(getDexShareText(entry));
      toast({ title: "Safe proof copied", description: "Caption and exact location stayed private." });
    } catch {
      toast({ title: "Copy unavailable", description: "Your proof stayed private." });
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-3 pb-24 sm:space-y-4">
      <FutureHero
        eyebrow="Proof Loop · The Controllables Dex"
        title="Proof Dex"
        icon={<Camera className="h-5 w-5" />}
        chips={
          <>
            <FutureChip icon={<LockKeyhole className="h-3.5 w-3.5" />} label="Private first" />
            <FutureChip icon={<Camera className="h-3.5 w-3.5" />} label={`${stats.totalProofCount} proof`} />
            <FutureChip icon={<Sparkles className="h-3.5 w-3.5" />} label={`${stats.missionProofCount} reps`} />
          </>
        }
        side={
          <div className="space-y-2">
            <div className="future-card px-3 py-3 sm:px-4 sm:py-4">
              <div className="flex items-start gap-3">
                <div className="future-icon-frame h-10 w-10">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground">Private-first</h2>
                    <InfoHint title="Privacy rules">
                      Share cards use safe copy only. No exact location, EXIF metadata, private reflections, wellness details, money, calendar, journal, or AI guidance.
                    </InfoHint>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FutureMetric label="Total" value={stats.totalProofCount.toString()} />
              <FutureMetric label="Mission reps" value={stats.missionProofCount.toString()} />
            </div>
            <Button asChild variant="futureOutline" className="w-full">
              <Link to="/proof">
                Back to Proof
              </Link>
            </Button>
          </div>
        }
      >
        <InfoHint title="The Controllables Dex">
          The Dex is where completed missions become visible evidence. Photos do not judge you. They help you collect proof of who you are becoming.
        </InfoHint>
      </FutureHero>

      <section className="grid grid-cols-2 gap-2 md:grid-cols-2 md:gap-3 xl:grid-cols-5">
        {categories.map((category) => (
          <FutureCard key={category.controllable} className="px-3 py-3 sm:px-4 sm:py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="future-icon-frame h-10 w-10 text-xl sm:h-11 sm:w-11 sm:text-2xl" aria-hidden="true">
                  {category.emoji}
                </span>
                <h2 className="mt-2 text-sm font-semibold text-foreground">{category.name}</h2>
                <p className="text-xs text-muted-foreground">{category.proofCount} proof</p>
              </div>
              <Badge variant={category.proofCount > 0 ? "secondary" : "outline"} className="text-[10px]">
                {category.proofCount > 0 ? category.chargeStage.label : "New"}
              </Badge>
            </div>

            <Progress value={category.chargeStage.progress} className="mt-3 h-1.5 sm:mt-4 sm:h-2" />

            <div className="mt-3 sm:mt-4">
              {category.recentProof ? (
                <div className="overflow-hidden rounded-xl border border-border/50 bg-background/60">
                  <img src={category.recentProof.imageUrl} alt={`${category.name} proof`} className="aspect-[4/3] w-full object-cover" />
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    Latest proof: {new Date(category.recentProof.capturedAt).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-primary/20 bg-background/50 px-3 py-3 sm:py-4">
                  <p className="text-sm font-medium text-foreground">{category.emptyTitle}</p>
                  <p className="mt-1 hidden text-xs leading-relaxed text-muted-foreground sm:block">{category.emptyDescription}</p>
                </div>
              )}
            </div>
          </FutureCard>
        ))}
      </section>

      <FuturePanel className="px-3 py-4 sm:px-5 sm:py-5 md:px-7">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Recent proof</h2>
            <InfoHint title="Share-safe proof" className="mt-1">
              Saved privately. Copying uses the share-safe payload, not private captions or metadata.
            </InfoHint>
          </div>
          <Badge variant="outline" className="text-[11px]">
            {recentEntries.length} recent
          </Badge>
        </div>

        {recentEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-primary/20 bg-background/50 px-4 py-6 text-center sm:py-8">
            <Camera className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-sm font-semibold text-foreground">No photo proof yet</h3>
            <div className="mt-1 flex justify-center">
              <InfoHint title="How to add proof">
                Complete a mission, choose Add Proof, and save one private photo to start building your Dex.
              </InfoHint>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentEntries.map((entry) => {
              const guide = getBookControllable(entry.targetControllable);
              const place = [entry.city, entry.state].filter(Boolean).join(", ");

              return (
                <article key={entry.id} className="future-card overflow-hidden">
                  <img src={entry.imageUrl} alt={`${guide.name} proof`} className="aspect-[4/3] w-full object-cover" />
                  <div className="space-y-3 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={cn("text-xs font-medium uppercase tracking-[0.16em]", guide.classes.textClass)}>
                          {guide.emoji} {guide.name}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold text-foreground">Mission proof collected</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(entry.capturedAt).toLocaleString()}
                          {place ? ` - ${place}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {entry.visibility}
                      </Badge>
                    </div>

                    {entry.caption ? (
                      <p className="rounded-xl border border-border/50 bg-card px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                        {entry.caption}
                      </p>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="futureOutline" size="sm" className="gap-2" onClick={() => copyProof(entry.id)}>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => deleteProofEntry(entry.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </FuturePanel>
    </div>
  );
}
