import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative w-10 h-10">
        {/* Sun/Dashboard logo mark with D in center */}
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Background circle (optional, for standalone use) */}
          <rect
            x="0"
            y="0"
            width="40"
            height="40"
            rx="8"
            className="fill-primary dark:fill-background"
          />
          
          {/* Sun rays */}
          <g className="stroke-accent dark:stroke-accent" strokeWidth="2" strokeLinecap="round">
            {/* Top ray */}
            <line x1="20" y1="4" x2="20" y2="8" />
            {/* Bottom ray */}
            <line x1="20" y1="32" x2="20" y2="36" />
            {/* Left ray */}
            <line x1="4" y1="20" x2="8" y2="20" />
            {/* Right ray */}
            <line x1="32" y1="20" x2="36" y2="20" />
            {/* Top-right diagonal */}
            <line x1="30.3" y1="9.7" x2="27.5" y2="12.5" />
            {/* Top-left diagonal */}
            <line x1="9.7" y1="9.7" x2="12.5" y2="12.5" />
            {/* Bottom-right diagonal */}
            <line x1="30.3" y1="30.3" x2="27.5" y2="27.5" />
            {/* Bottom-left diagonal */}
            <line x1="9.7" y1="30.3" x2="12.5" y2="27.5" />
          </g>
          
          {/* Center circle */}
          <circle
            cx="20"
            cy="20"
            r="9"
            className="stroke-accent dark:stroke-accent fill-none"
            strokeWidth="2"
          />
          
          {/* D letter */}
          <text
            x="20"
            y="25"
            textAnchor="middle"
            className="fill-accent dark:fill-accent font-bold"
            style={{ 
              fontSize: '12px', 
              fontFamily: 'Space Grotesk, system-ui, sans-serif',
              fontWeight: 700
            }}
          >
            D
          </text>
        </svg>
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