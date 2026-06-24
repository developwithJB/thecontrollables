import { getBookControllable } from "@/lib/bookWorld";
import type { LocalMission } from "@/lib/localMissionDrop";

export interface MissionDropEmailMission {
  title: string;
  instruction: string;
  xpReward?: number;
}

export interface MissionDropEmailInput {
  coreMission: MissionDropEmailMission;
  bonusMission?: MissionDropEmailMission | null;
  localMission?: LocalMission | null;
  recoveryMission?: MissionDropEmailMission | null;
}

export interface MissionDropEmailContent {
  subject: string;
  text: string;
  html: string;
}

interface EmailSection {
  label: string;
  title: string;
  instruction: string;
  reward?: string;
}

export function formatMissionDropEmail(input: MissionDropEmailInput): MissionDropEmailContent {
  const sections: EmailSection[] = [
    {
      label: "Core Card",
      title: input.coreMission.title,
      instruction: input.coreMission.instruction,
      reward: formatGenericReward(input.coreMission),
    },
  ];

  if (input.bonusMission) {
    sections.push({
      label: "Bonus Card",
      title: input.bonusMission.title,
      instruction: input.bonusMission.instruction,
      reward: formatGenericReward(input.bonusMission),
    });
  }

  if (input.localMission) {
    const guide = getBookControllable(input.localMission.targetControllable);
    sections.push({
      label: input.localMission.city ? `${input.localMission.city} Mission Card` : "Local Card",
      title: `Charge ${guide.name}`,
      instruction: input.localMission.instruction,
      reward: `+${input.localMission.xpReward} ${guide.name} XP · +${input.localMission.selfTrustReward} Self-Trust`,
    });
  }

  if (input.recoveryMission) {
    sections.push({
      label: "Recovery Card",
      title: input.recoveryMission.title,
      instruction: input.recoveryMission.instruction,
      reward: formatGenericReward(input.recoveryMission),
    });
  }

  const intro = "Train one Controllable. Earn XP. Build Self-Trust. Add proof to your Dex.";
  const dailyLoop = [
    "Today's loop:",
    "1. Daily Charge: Control / Release / Move.",
    "2. Promise Ledger: keep or recover one promise.",
    "3. Proof Loop: add optional proof to your Dex.",
  ].join("\n");
  const text = [
    "Today's Training Drop",
    intro,
    "",
    sections
    .map((section) =>
      [section.label, section.title, section.instruction, section.reward].filter(Boolean).join("\n"),
    )
    .join("\n\n"),
    "",
    dailyLoop,
  ].join("\n");

  const html = sections
    .map(
      (section) => `
        <section style="margin:0 0 18px 0;">
          <p style="margin:0 0 4px 0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">${escapeHtml(section.label)}</p>
          <h2 style="margin:0 0 4px 0;font-size:18px;line-height:1.25;color:#0f172a;">${escapeHtml(section.title)}</h2>
          <p style="margin:0;color:#334155;">${escapeHtml(section.instruction)}</p>
          ${section.reward ? `<p style="margin:6px 0 0 0;color:#0f766e;font-weight:600;">${escapeHtml(section.reward)}</p>` : ""}
        </section>`,
    )
    .join("");

  return {
    subject: "Today's Training Drop",
    text,
    html: `
      <div>
        <section style="margin:0 0 20px 0;">
          <p style="margin:0 0 4px 0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0ea5e9;">Today's Training Drop</p>
          <h1 style="margin:0 0 6px 0;font-size:24px;line-height:1.15;color:#0f172a;">Train your Controllable card.</h1>
          <p style="margin:0;color:#334155;">${escapeHtml(intro)}</p>
        </section>
        ${html}
        <section style="border:1px solid #dbeafe;border-radius:14px;background:#eff6ff;padding:14px;margin:4px 0 0 0;">
          <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0369a1;">Today's loop</p>
          <p style="margin:0 0 6px 0;color:#0f172a;"><strong>Daily Charge</strong> — Control / Release / Move.</p>
          <p style="margin:0 0 6px 0;color:#0f172a;"><strong>Promise Ledger</strong> — keep or recover one promise.</p>
          <p style="margin:0;color:#0f172a;"><strong>Proof Loop</strong> — add optional proof to your Dex.</p>
        </section>
      </div>`,
  };
}

function formatGenericReward(mission: MissionDropEmailMission): string | undefined {
  return typeof mission.xpReward === "number" ? `+${mission.xpReward} XP · Card progress` : undefined;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
