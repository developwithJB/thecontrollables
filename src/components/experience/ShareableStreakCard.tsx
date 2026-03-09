import { forwardRef } from "react";
import { Flame } from "lucide-react";

interface ShareableStreakCardProps {
  milestone: number;
  xpBonus: number;
  displayName?: string;
}

export const ShareableStreakCard = forwardRef<HTMLDivElement, ShareableStreakCardProps>(
  ({ milestone, xpBonus, displayName }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: 480,
          height: 280,
          padding: 32,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          borderRadius: 24,
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative glow */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,146,60,0.3) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -40,
            left: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,146,60,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(251,146,60,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Flame style={{ width: 28, height: 28, color: "#fb923c" }} />
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
              {milestone}-Day Streak
            </div>
            <div style={{ fontSize: 16, color: "#fb923c", fontWeight: 600, marginTop: 4 }}>
              +{xpBonus} XP Earned
            </div>
          </div>
        </div>

        {displayName && (
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", zIndex: 1 }}>
            {displayName}
          </div>
        )}

        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            zIndex: 1,
            marginTop: 8,
          }}
        >
          thecontrollables.lovable.app
        </div>
      </div>
    );
  }
);

ShareableStreakCard.displayName = "ShareableStreakCard";
