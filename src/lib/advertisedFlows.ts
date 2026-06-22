import { APP_ROUTES } from "@/lib/appRoutes";

export type AdvertisedFlowId =
  | "starting_charge"
  | "read_along"
  | "daily_charge"
  | "promise_ledger"
  | "proof_loop";

export type AdvertisedFlowStatus = "ready" | "in_progress" | "complete";

export interface AdvertisedFlow {
  id: AdvertisedFlowId;
  name: string;
  promise: string;
  route: string;
  primaryCta: string;
  status: AdvertisedFlowStatus;
  proofMetric: string;
  nextAction: string;
}

export interface AdvertisedFlowState {
  hasStartingCharge?: boolean;
  readAlongProgressPercent?: number;
  dailyChargeComplete?: boolean;
  selfTrustLevel?: number;
  keptPromises?: number;
  recoveryWins?: number;
  proofCount?: number;
}

export const ADVERTISED_FLOW_IDS: AdvertisedFlowId[] = [
  "starting_charge",
  "read_along",
  "daily_charge",
  "promise_ledger",
  "proof_loop",
];

export function getAdvertisedFlows(state: AdvertisedFlowState = {}): AdvertisedFlow[] {
  const readAlongProgressPercent = clampPercent(state.readAlongProgressPercent ?? 0);
  const keptPromises = Math.max(0, state.keptPromises ?? 0);
  const recoveryWins = Math.max(0, state.recoveryWins ?? 0);
  const proofCount = Math.max(0, state.proofCount ?? 0);
  const selfTrustLevel = Math.max(1, state.selfTrustLevel ?? 1);

  return [
    {
      id: "starting_charge",
      name: "Starting Charge",
      promise: "Find your current charge in 60 seconds.",
      route: APP_ROUTES.quickStart,
      primaryCta: state.hasStartingCharge ? "Retake the read" : "Find my charge",
      status: state.hasStartingCharge ? "complete" : "ready",
      proofMetric: state.hasStartingCharge ? "Starting read saved" : "60-second read",
      nextAction: state.hasStartingCharge
        ? "Use the result to choose today's training focus."
        : "Answer the first honest read and get Mission 001.",
    },
    {
      id: "read_along",
      name: "Read Along Training",
      promise: "Read the book with chapter reps.",
      route: APP_ROUTES.readAlong,
      primaryCta: readAlongProgressPercent > 0 ? "Continue reading" : "Start Read Along",
      status:
        readAlongProgressPercent >= 100
          ? "complete"
          : readAlongProgressPercent > 0
            ? "in_progress"
            : "ready",
      proofMetric: `${readAlongProgressPercent}% complete`,
      nextAction: "Keep the app spoiler-safe while the book turns into practice.",
    },
    {
      id: "daily_charge",
      name: "Daily Charge",
      promise: "Start the day with Control / Release / Move.",
      route: APP_ROUTES.home,
      primaryCta: state.dailyChargeComplete ? "Review today" : "Do Daily Charge",
      status: state.dailyChargeComplete ? "complete" : "ready",
      proofMetric: state.dailyChargeComplete ? "Today's ritual saved" : "Today is open",
      nextAction: "Name what you control, what you release, and the next honest move.",
    },
    {
      id: "promise_ledger",
      name: "Promise Ledger",
      promise: "Build Self-Trust through kept promises.",
      route: APP_ROUTES.myControllables,
      primaryCta: keptPromises + recoveryWins > 0 ? "Open ledger" : "Log first promise",
      status: keptPromises + recoveryWins > 0 ? "in_progress" : "ready",
      proofMetric: `Self-Trust L${selfTrustLevel} · ${keptPromises} kept · ${recoveryWins} recovered`,
      nextAction: "Log one promise or a recovery win without streak shame.",
    },
    {
      id: "proof_loop",
      name: "Proof Loop",
      promise: "Collect private proof of real-life reps.",
      route: APP_ROUTES.proof,
      primaryCta: proofCount > 0 ? "Open proof" : "Start proof loop",
      status: proofCount > 0 ? "in_progress" : "ready",
      proofMetric: `${proofCount} proof ${proofCount === 1 ? "card" : "cards"}`,
      nextAction: "After a mission, add optional photo proof or skip cleanly.",
    },
  ];
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}
