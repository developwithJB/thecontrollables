import type React from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface InfoHintProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export function InfoHint({
  title = "More context",
  children,
  className,
  contentClassName,
  side = "top",
  align = "end",
}: InfoHintProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={title}
          title={title}
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/55 text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-primary",
            className,
          )}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className={cn("w-72 rounded-2xl p-3 text-sm leading-6 shadow-xl", contentClassName)}
      >
        {typeof children === "string" ? <p className="text-muted-foreground">{children}</p> : children}
      </PopoverContent>
    </Popover>
  );
}

