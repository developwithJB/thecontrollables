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
      label: "Core Mission",
      title: input.coreMission.title,
      instruction: input.coreMission.instruction,
      reward: formatGenericReward(input.coreMission),
    },
  ];

  if (input.bonusMission) {
    sections.push({
      label: "Bonus Mission",
      title: input.bonusMission.title,
      instruction: input.bonusMission.instruction,
      reward: formatGenericReward(input.bonusMission),
    });
  }

  if (input.localMission) {
    const guide = getBookControllable(input.localMission.targetControllable);
    sections.push({
      label: input.localMission.city ? `${input.localMission.city} Mission` : "Local Mission",
      title: `Charge ${guide.name}`,
      instruction: input.localMission.instruction,
      reward: `+${input.localMission.xpReward} ${guide.name} XP`,
    });
  }

  if (input.recoveryMission) {
    sections.push({
      label: "Recovery Mission",
      title: input.recoveryMission.title,
      instruction: input.recoveryMission.instruction,
      reward: formatGenericReward(input.recoveryMission),
    });
  }

  const text = sections
    .map((section) =>
      [section.label, section.title, section.instruction, section.reward].filter(Boolean).join("\n"),
    )
    .join("\n\n");

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
    subject: "Today's Mission Drop",
    text,
    html: `<div>${html}</div>`,
  };
}

function formatGenericReward(mission: MissionDropEmailMission): string | undefined {
  return typeof mission.xpReward === "number" ? `+${mission.xpReward} XP` : undefined;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
