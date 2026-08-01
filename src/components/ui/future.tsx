import type React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface FutureHeroProps {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  chips?: React.ReactNode;
  side?: React.ReactNode;
  className?: string;
}

export function FutureHero({
  eyebrow,
  title,
  icon,
  children,
  chips,
  side,
  className,
}: FutureHeroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.header
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className={cn("future-hero", className)}
    >
      <div className="future-hero-rail" aria-hidden="true" />
      <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.75fr)] lg:items-end">
        <div className="min-w-0 space-y-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="future-icon-frame">{icon}</span>
            <div className="min-w-0">
              <p className="future-eyebrow">{eyebrow}</p>
              <h1 className="future-title">{title}</h1>
            </div>
          </div>
          {children ? <div className="max-w-2xl">{children}</div> : null}
          {chips ? <div className="future-chip-row" tabIndex={0} aria-label="Page context">{chips}</div> : null}
        </div>
        {side ? <div className="future-hero-side">{side}</div> : null}
      </div>
    </motion.header>
  );
}

export function FutureChip({
  icon,
  label,
  className,
}: {
  icon?: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("future-chip", className)}>
      {icon ? <span className="text-primary">{icon}</span> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

export function FutureMetric({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("future-metric", className)}>
      <div className="flex items-center gap-1.5">
        {icon ? <span className="text-primary">{icon}</span> : null}
        <p className="future-metric-label">{label}</p>
      </div>
      <p className="future-metric-value">{value}</p>
    </div>
  );
}

export function FuturePanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("future-panel", className)}
    >
      {children}
    </motion.section>
  );
}

export function FutureCard({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & HTMLMotionProps<"article">) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-24px" }}
      whileTap={reduceMotion ? undefined : { scale: 0.992 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("future-card", className)}
      {...props}
    >
      {children}
    </motion.article>
  );
}

export function FutureSectionHeader({
  eyebrow,
  title,
  info,
  action,
}: {
  eyebrow?: string;
  title: string;
  info?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <p className="future-eyebrow">{eyebrow}</p> : null}
        <div className="mt-1 flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold leading-tight text-foreground">{title}</h2>
          {info}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
