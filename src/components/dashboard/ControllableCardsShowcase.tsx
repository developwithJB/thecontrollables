import { motion } from "framer-motion";
import { ArrowUpRight, Share2, Sparkles, Trophy, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/ui/info-hint";
import { FutureMetric, FuturePanel } from "@/components/ui/future";
import { useToast } from "@/hooks/use-toast";
import { useControllableLevels } from "@/hooks/useControllableLevels";
import { ALL_CONTROLLABLES } from "@/lib/controllableTheme";
import {
  buildControllableTrainingCard,
  type ControllableTrainingCard,
} from "@/lib/controllableCards";
import { APP_ROUTES } from "@/lib/appRoutes";
import { cn } from "@/lib/utils";

interface ControllableCardsShowcaseProps {
  userId: string | null;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

const RARITY_CLASSES: Record<ControllableTrainingCard["rarity"], string> = {
  Starter: "border-slate-500/35 bg-slate-500/10 text-slate-200",
  Uncommon: "border-emerald-400/35 bg-emerald-400/10 text-emerald-100",
  Rare: "border-sky-400/40 bg-sky-400/10 text-sky-100",
  Epic: "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-100",
  "Fully Charged": "border-amber-300/45 bg-amber-300/10 text-amber-100",
};

export function ControllableCardsShowcase({
  userId,
  title = "Controllable Card Deck",
  subtitle = "Train the five cards. Share the proof, not the private work.",
  compact = false,
}: ControllableCardsShowcaseProps) {
  const { data: levels, isLoading } = useControllableLevels(userId);
  const { toast } = useToast();
  const navigate = useNavigate();

  if (isLoading || !levels) {
    return (
      <FuturePanel>
        <div className="mb-4 h-10 w-56 animate-pulse rounded-xl bg-muted/60" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {ALL_CONTROLLABLES.map((type) => (
            <div key={type} className={cn("animate-pulse rounded-2xl bg-muted/45", compact ? "h-44" : "h-72")} />
          ))}
        </div>
      </FuturePanel>
    );
  }

  const cards = ALL_CONTROLLABLES.map((type) => {
    const level = levels.find((item) => item.type === type) ?? {
      type,
      totalXp: 0,
      level: 1,
      current: 0,
      next: 25,
      progress: 0,
    };

    return buildControllableTrainingCard(level);
  });
  const deckXp = cards.reduce((sum, card) => sum + card.xp, 0);
  const topCard = [...cards].sort((a, b) => b.xp - a.xp || b.progressPercent - a.progressPercent)[0];
  const chargedCards = cards.filter((card) => card.stateLabel !== "Base").length;

  const handleShareCard = async (card: ControllableTrainingCard) => {
    const share = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
      clipboard?: Clipboard;
    };

    try {
      let shared = false;
      if (share.share) {
        await share.share({
          title: `${card.name} Card`,
          text: card.shareText,
        });
        shared = true;
      } else if (share.clipboard) {
        await share.clipboard.writeText(card.shareText);
        shared = true;
      }

      if (!shared) throw new Error("Sharing is unavailable in this browser.");

      toast({
        title: "Card ready to share",
        description: `${card.name} card copy is safe by default.`,
      });
    } catch {
      toast({
        title: "Card share canceled",
        description: "Nothing was posted.",
      });
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="future-panel"
    >
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="future-icon-frame h-10 w-10 sm:h-12 sm:w-12">
            <Trophy className="h-5 w-5" />
          </span>
          <div>
            <p className="future-eyebrow">Card Training</p>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold leading-tight text-foreground sm:text-2xl">{title}</h2>
              {!compact ? <InfoHint title="Card Training">{subtitle}</InfoHint> : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:min-w-[360px]">
          <FutureMetric label="Deck XP" value={deckXp.toLocaleString()} icon={<ArrowUpRight className="h-3 w-3" />} />
          <FutureMetric label="Charged" value={`${chargedCards}/5`} icon={<Zap className="h-3 w-3" />} />
          <FutureMetric label="Lead card" value={topCard?.name ?? "Habit"} icon={<Trophy className="h-3 w-3" />} />
        </div>
      </div>

      <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-1 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-5">
        {cards.map((card) => (
          <ControllableTrainingCardView
            key={card.id}
            card={card}
            compact={compact}
            onShare={() => handleShareCard(card)}
            onTrain={() => navigate(`${APP_ROUTES.train}?controllable=${card.id}`)}
          />
        ))}
      </div>
    </motion.section>
  );
}

function ControllableTrainingCardView({
  card,
  compact,
  onShare,
  onTrain,
}: {
  card: ControllableTrainingCard;
  compact: boolean;
  onShare: () => void;
  onTrain: () => void;
}) {
  return (
    <motion.article
      whileHover={{ y: -3 }}
      className={cn(
        "future-card group relative min-w-[min(19rem,82vw)] snap-start border bg-background/60 shadow-[0_18px_50px_hsl(var(--background)/0.28)] sm:min-w-0",
        compact ? "p-3" : "p-4",
      )}
      style={{ borderColor: card.stateLabel === "Base" ? "hsl(var(--border))" : card.color }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 opacity-90"
        style={{ background: `linear-gradient(90deg, transparent, ${card.color}, transparent)` }}
      />
      <div className="pointer-events-none absolute right-0 top-0 h-16 w-16 opacity-60" aria-hidden="true">
        <div className="absolute right-0 top-0 h-px w-16" style={{ backgroundColor: card.color }} />
        <div className="absolute right-0 top-0 h-16 w-px" style={{ backgroundColor: card.color }} />
      </div>

      <div className="relative flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Card {card.cardNumber}
          </p>
          <span
            className={cn(
              "mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
              RARITY_CLASSES[card.rarity],
            )}
          >
            {card.rarity}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onShare}
            aria-label={`Share ${card.name} card`}
            title={`Share ${card.name} card`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-primary/15 bg-background/50 text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-primary sm:h-9 sm:w-9"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <span
            className="flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl shadow-[inset_0_0_24px_hsl(var(--primary)/0.05)] sm:h-14 sm:w-14 sm:text-3xl"
            style={{ backgroundColor: card.softColor, borderColor: card.color }}
            aria-hidden="true"
          >
            {card.icon}
          </span>
        </div>
      </div>

      <div className={cn("relative", compact ? "mt-3" : "mt-5")}>
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl font-bold text-foreground">{card.name}</h3>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              L{card.level} · {card.stageLabel}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
            <Zap className="h-3 w-3" />
            {card.xp}
          </span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/70">
          <span
            className="block h-full rounded-full"
            style={{
              width: `${Math.max(card.progressPercent, card.xp > 0 ? 8 : 3)}%`,
              backgroundColor: card.color,
              boxShadow: `0 0 14px ${card.color}`,
            }}
          />
        </div>

        <div className={cn("grid gap-2", compact ? "mt-3" : "mt-4")}>
          {card.stats.map((stat, index) => (
            <div key={stat.label} className={cn(
              "items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/45 px-2.5 py-2 sm:flex",
              index === 0 ? "flex" : "hidden",
            )}>
              <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {stat.label}
              </span>
              <span className="font-display text-sm font-bold text-foreground">{stat.value}</span>
            </div>
          ))}
        </div>

        {!compact ? (
          <p className="mt-3 hidden truncate text-[11px] font-medium text-muted-foreground sm:block">
            Next unlock: {card.nextStageLabel}
          </p>
        ) : null}

        <div className={compact ? "mt-3" : "mt-4"}>
          <Button type="button" variant="future" size="sm" className="h-10 w-full rounded-xl text-xs" onClick={onTrain}>
            <Sparkles className="h-3.5 w-3.5" />
            Train
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
