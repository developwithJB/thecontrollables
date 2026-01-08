import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative w-10 h-10">
        {/* Cockpit-inspired logo mark */}
        <div className="absolute inset-0 rounded-lg bg-primary flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-primary-foreground/80 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-accent" />
          </div>
        </div>
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="font-display font-bold text-lg leading-tight text-foreground">
            The Dashboard
          </span>
          <span className="text-xs text-muted-foreground">
            by The Controllables
          </span>
        </div>
      )}
    </div>
  );
}
