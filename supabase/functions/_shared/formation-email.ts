export type FormationEmailTrack = "read_along" | "charge_40" | "fully_charged_75";
export type FormationEmailCircuit = "awareness" | "perspective" | "habit" | "wellness" | "environment";

export interface FormationDailyEmailInput {
  displayName: string | null;
  track: FormationEmailTrack;
  dayNumber: number;
  completedCircuits: FormationEmailCircuit[];
  appUrl: string;
  settingsUrl: string;
}

interface CircuitEmailDefinition {
  id: FormationEmailCircuit;
  icon: string;
  name: string;
  action: Record<FormationEmailTrack, string>;
}

export const FORMATION_EMAIL_CIRCUITS: CircuitEmailDefinition[] = [
  {
    id: "awareness",
    icon: "&#129417;",
    name: "Awareness",
    action: {
      read_along: "Read one section and name what is true.",
      charge_40: "Scripture before noise. Name one honest truth.",
      fully_charged_75: "Scripture before phone, formation reading, one honest truth.",
    },
  },
  {
    id: "perspective",
    icon: "&#128034;",
    name: "Perspective",
    action: {
      read_along: "Pray over what you read and choose one faithful move.",
      charge_40: "Pray, give thanks, then Control / Release / Move.",
      fully_charged_75: "Prayer, gratitude, and Control / Release / Move.",
    },
  },
  {
    id: "habit",
    icon: "&#128044;",
    name: "Habit",
    action: {
      read_along: "Keep one promise shaped by today&apos;s reading.",
      charge_40: "Name and keep one Main Promise.",
      fully_charged_75: "Keep your Main Promise. Private proof is optional.",
    },
  },
  {
    id: "wellness",
    icon: "&#128752;&#65039;",
    name: "Wellness",
    action: {
      read_along: "Choose one act of physical stewardship.",
      charge_40: "Honor your movement, food, water, and sleep covenant.",
      fully_charged_75: "Honor your covenant; complete both movement blocks safely.",
    },
  },
  {
    id: "environment",
    icon: "&#128640;",
    name: "Environment",
    action: {
      read_along: "Make the next faithful rep easier to begin.",
      charge_40: "Remove friction, prepare tomorrow, encourage someone.",
      fully_charged_75: "Prepare tomorrow and intentionally serve or encourage someone.",
    },
  },
];

const TRACK_LABELS: Record<FormationEmailTrack, string> = {
  read_along: "Read Along",
  charge_40: "40-Day Charge",
  fully_charged_75: "Fully Charged: 75 Days",
};

const TRACK_DURATIONS: Record<FormationEmailTrack, number | null> = {
  read_along: null,
  charge_40: 40,
  fully_charged_75: 75,
};

export function getFormationSeason(dayNumber: number): { name: string; focus: string } {
  if (dayNumber <= 25) return { name: "Be With Jesus", focus: "Scripture, prayer, truth, and surrender." };
  if (dayNumber <= 50) return { name: "Become Like Jesus", focus: "Obedience, integrity, stewardship, and recovery." };
  return { name: "Do What Jesus Did", focus: "Mercy, service, encouragement, and generosity." };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildFormationDailyEmailPayload(input: FormationDailyEmailInput) {
  const duration = TRACK_DURATIONS[input.track];
  const boundedDay = duration ? Math.min(Math.max(input.dayNumber, 1), duration) : Math.max(input.dayNumber, 1);
  const season = input.track === "fully_charged_75" ? getFormationSeason(boundedDay) : null;
  const completed = new Set(input.completedCircuits);
  const completedCount = FORMATION_EMAIL_CIRCUITS.filter((circuit) => completed.has(circuit.id)).length;
  const firstName = input.displayName?.trim().split(/\s+/)[0] || "there";
  const trackLabel = TRACK_LABELS[input.track];
  const dayLabel = duration ? `Day ${boundedDay} of ${duration}` : "Today&apos;s practice";
  const subject = input.track === "fully_charged_75"
    ? `Day ${boundedDay} of 75: ${season?.name}`
    : input.track === "charge_40"
      ? `Day ${boundedDay} of 40: your five Controllables`
      : "Today&apos;s Read Along rep is ready";
  const firstOpenCircuit = FORMATION_EMAIL_CIRCUITS.find((circuit) => !completed.has(circuit.id));
  const firstMove = firstOpenCircuit
    ? `Start with ${firstOpenCircuit.name}: ${firstOpenCircuit.action[input.track].replaceAll("&apos;", "'")}`
    : "Today&apos;s five circuits are recorded. Close the day with gratitude.";

  const circuitRows = FORMATION_EMAIL_CIRCUITS.map((circuit) => {
    const isComplete = completed.has(circuit.id);
    return `
      <tr>
        <td style="padding:11px 0;border-top:1px solid #e5e7eb;vertical-align:top;width:30px;font-size:17px;">${circuit.icon}</td>
        <td style="padding:11px 8px;border-top:1px solid #e5e7eb;vertical-align:top;">
          <div style="font-size:13px;font-weight:700;color:#111827;">${circuit.name}</div>
          <div style="margin-top:2px;font-size:12px;line-height:1.45;color:#6b7280;">${circuit.action[input.track]}</div>
        </td>
        <td style="padding:11px 0;border-top:1px solid #e5e7eb;vertical-align:top;text-align:right;white-space:nowrap;">
          <span style="display:inline-block;border-radius:999px;padding:4px 8px;background:${isComplete ? "#dcfce7" : "#f3f4f6"};color:${isComplete ? "#166534" : "#6b7280"};font-size:10px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;">${isComplete ? "Recorded" : "Open"}</span>
        </td>
      </tr>`;
  }).join("");

  const html = `
    <!doctype html>
    <html><body style="margin:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Five circuits. One faithful next move. ${completedCount} of 5 recorded.</div>
      <div style="max-width:480px;margin:0 auto;padding:24px 14px 32px;">
        <div style="overflow:hidden;border:1px solid #dbeafe;border-radius:18px;background:#ffffff;box-shadow:0 18px 60px rgba(15,23,42,.08);">
          <div style="padding:24px;background:#07111f;color:#ffffff;">
            <div style="font-size:10px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:#67e8f9;">The Dashboard &middot; ${escapeHtml(trackLabel)}</div>
            <div style="margin-top:14px;font-size:12px;font-weight:700;color:#94a3b8;">${dayLabel}</div>
            <h1 style="margin:5px 0 0;font-size:27px;line-height:1.15;letter-spacing:-.2px;">Good morning, ${escapeHtml(firstName)}.</h1>
            ${season ? `<p style="margin:10px 0 0;font-size:15px;font-weight:700;color:#ffffff;">${season.name}</p><p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:#cbd5e1;">${season.focus}</p>` : `<p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:#cbd5e1;">Read. Practice. Carry one truth into the day.</p>`}
          </div>
          <div style="padding:20px 22px 10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <div style="font-size:11px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:#0891b2;">Today&apos;s five circuits</div>
              <div style="font-size:11px;font-weight:700;color:#64748b;">${completedCount}/5</div>
            </div>
            <table role="presentation" style="width:100%;border-collapse:collapse;">${circuitRows}</table>
          </div>
          <div style="padding:10px 22px 24px;">
            <div style="border:1px solid #bae6fd;border-radius:13px;background:#ecfeff;padding:14px;">
              <div style="font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#0e7490;">First honest move</div>
              <div style="margin-top:5px;font-size:13px;line-height:1.5;font-weight:650;color:#164e63;">${escapeHtml(firstMove)}</div>
            </div>
            <a href="${escapeHtml(input.appUrl)}" style="display:block;margin-top:16px;border-radius:11px;background:#0891b2;padding:14px 18px;text-align:center;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;">Open today&apos;s practice &rarr;</a>
            <p style="margin:14px 0 0;text-align:center;font-size:11px;line-height:1.5;color:#94a3b8;">Practice is a response to grace, never a measure of God&apos;s approval.</p>
          </div>
        </div>
        <p style="margin:14px 0 0;text-align:center;font-size:10px;line-height:1.6;color:#94a3b8;">Sent because you turned on the daily formation email when choosing your path. Change or turn it off anytime in <a href="${escapeHtml(input.settingsUrl)}" style="color:#64748b;">Settings</a>.</p>
      </div>
    </body></html>`;

  const textCircuits = FORMATION_EMAIL_CIRCUITS.map((circuit) =>
    `${completed.has(circuit.id) ? "[recorded]" : "[open]"} ${circuit.name}: ${circuit.action[input.track].replaceAll("&apos;", "'")}`,
  ).join("\n");
  const text = [
    `${trackLabel} - ${dayLabel.replaceAll("&apos;", "'")}`,
    season ? `${season.name}: ${season.focus}` : "Read. Practice. Carry one truth into the day.",
    "",
    textCircuits,
    "",
    `First honest move: ${firstMove.replaceAll("&apos;", "'")}`,
    `Open today's practice: ${input.appUrl}`,
    "",
    "Practice is a response to grace, never a measure of God's approval.",
    `Manage email settings: ${input.settingsUrl}`,
  ].join("\n");

  return {
    subject: subject.replaceAll("&apos;", "'"),
    previewText: `Five circuits. One faithful next move. ${completedCount} of 5 recorded.`,
    html,
    text,
  };
}
