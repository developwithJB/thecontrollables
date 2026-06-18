import { Link } from "react-router-dom";
import { Camera, Copy, LockKeyhole, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
    <div className="mx-auto max-w-6xl space-y-6 pb-24">
      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <div className="space-y-4 px-5 py-6 md:px-7">
            <Badge variant="secondary" className="w-fit text-[11px] uppercase tracking-[0.16em]">
              The Controllables Dex
            </Badge>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                Collect proof of real-life reps.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                The Dex is where completed missions become visible evidence. Photos do not judge you. They help you collect proof of who you are becoming.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1 text-[11px]">
                <LockKeyhole className="h-3 w-3" />
                Private first
              </Badge>
              <Badge variant="outline" className="gap-1 text-[11px]">
                <Camera className="h-3 w-3" />
                {stats.totalProofCount} photo proof
              </Badge>
              <Badge variant="outline" className="gap-1 text-[11px]">
                <Sparkles className="h-3 w-3" />
                {stats.missionProofCount} mission reps
              </Badge>
            </div>
          </div>

          <div className="border-t border-border/60 bg-background/50 px-5 py-5 lg:border-l lg:border-t-0">
            <div className="rounded-2xl border border-border/60 bg-card px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Private-first status</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Share cards use safe copy only. No exact location, EXIF metadata, private reflections, wellness details, money, calendar, journal, or AI guidance.
                  </p>
                </div>
              </div>
            </div>
            <Link to="/proof" className="mt-3 block">
              <Button variant="outline" className="w-full">
                Back to Proof
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {categories.map((category) => (
          <article key={category.controllable} className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-2xl" aria-hidden="true">
                  {category.emoji}
                </span>
                <h2 className="mt-2 text-sm font-semibold text-foreground">{category.name}</h2>
                <p className="text-xs text-muted-foreground">{category.proofCount} proof collected</p>
              </div>
              <Badge variant={category.proofCount > 0 ? "secondary" : "outline"} className="text-[10px]">
                {category.chargeStage.label}
              </Badge>
            </div>

            <Progress value={category.chargeStage.progress} className="mt-4 h-2" />

            <div className="mt-4">
              {category.recentProof ? (
                <div className="overflow-hidden rounded-xl border border-border/50 bg-background/60">
                  <img src={category.recentProof.imageUrl} alt={`${category.name} proof`} className="aspect-[4/3] w-full object-cover" />
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    Latest proof: {new Date(category.recentProof.capturedAt).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-background/60 px-3 py-4">
                  <p className="text-sm font-medium text-foreground">{category.emptyTitle}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{category.emptyDescription}</p>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card px-5 py-5 shadow-sm md:px-7">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Recent proof cards</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Saved privately. Copying uses the share-safe payload, not private captions or metadata.
            </p>
          </div>
          <Badge variant="outline" className="text-[11px]">
            {recentEntries.length} recent
          </Badge>
        </div>

        {recentEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-8 text-center">
            <Camera className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-sm font-semibold text-foreground">No photo proof yet</h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              Complete a mission, choose Add Proof, and save one private photo to start building your Dex.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentEntries.map((entry) => {
              const guide = getBookControllable(entry.targetControllable);
              const place = [entry.city, entry.state].filter(Boolean).join(", ");

              return (
                <article key={entry.id} className="overflow-hidden rounded-2xl border border-border/60 bg-background/60">
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
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => copyProof(entry.id)}>
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
      </section>
    </div>
  );
}
