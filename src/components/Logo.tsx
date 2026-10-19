import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative w-10 h-10 group">
        {/* Sun/Dashboard logo mark with D in center */}
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Background */}
          <rect
            x="0"
            y="0"
            width="40"
            height="40"
            rx="8"
            className="fill-primary dark:fill-[hsl(222,47%,11%)]"
          />
          
          {/* Sun rays */}
          <g 
            className="stroke-accent opacity-90 group-hover:opacity-100 transition-opacity duration-300"
            strokeWidth="2" 
            strokeLinecap="round"
          >
            {/* Rays */}
            <line x1="20" y1="4" x2="20" y2="8" />
            <line x1="20" y1="32" x2="20" y2="36" />
            <line x1="4" y1="20" x2="8" y2="20" />
            <line x1="32" y1="20" x2="36" y2="20" />
            <line x1="30.3" y1="9.7" x2="27.5" y2="12.5" />
            <line x1="9.7" y1="9.7" x2="12.5" y2="12.5" />
            <line x1="30.3" y1="30.3" x2="27.5" y2="27.5" />
            <line x1="9.7" y1="30.3" x2="12.5" y2="27.5" />
          </g>
          
          {/* Center circle */}
          <circle
            cx="20"
            cy="20"
            r="9"
            className="stroke-accent fill-none"
            strokeWidth="2"
          />
          
          {/* D letter */}
          <path
            d="M16 13.5h3.5c3.5 0 6 2.5 6 6.5s-2.5 6.5-6 6.5H16V13.5z M18.5 15.8v8.4h1c2.3 0 3.8-1.7 3.8-4.2s-1.5-4.2-3.8-4.2h-1z"
            className="fill-accent"
          />
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