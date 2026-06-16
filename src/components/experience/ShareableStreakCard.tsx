import { forwardRef } from "react";
import { buildShareProofPayload } from "@/lib/shareProof";

interface ShareableStreakCardProps {
  milestone: number;
  xpBonus: number;
}

export const ShareableStreakCard = forwardRef<HTMLDivElement, ShareableStreakCardProps>(
  ({ milestone, xpBonus }, ref) => {
    const payload = buildShareProofPayload({
      kind: "charge_stage",
      controllable: "wellness",
      chargeStage: milestone >= 30 ? "fully charged" : "charged",
      xp: xpBonus,
      level: milestone,
      visibility: "anonymous",
    });

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
          background: "linear-gradient(135deg, #07111f 0%, #0d1f2d 50%, #103849 100%)",
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
            background: "radial-gradient(circle, rgba(56,189,248,0.28) 0%, transparent 70%)",
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
            background: "radial-gradient(circle, rgba(125,211,252,0.14) 0%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, zIndex: 1 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(56,189,248,0.16)",
              border: "1px solid rgba(255,255,255,0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 30 }}>{payload.icon}</span>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
              {payload.headline}
            </div>
            <div style={{ fontSize: 16, color: "#7dd3fc", fontWeight: 600, marginTop: 6 }}>
              {payload.xpLabel ?? "Charge XP"} · {payload.levelLabel}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.68)", zIndex: 1 }}>
          {payload.proofLine}
        </div>

        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            zIndex: 1,
            marginTop: 8,
          }}
        >
          The Dashboard · The Controllables
        </div>
      </div>
    );
  }
);

ShareableStreakCard.displayName = "ShareableStreakCard";
