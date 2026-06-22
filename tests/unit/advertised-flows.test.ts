import { describe, expect, it } from "vitest";

import { ADVERTISED_FLOW_IDS, getAdvertisedFlows } from "@/lib/advertisedFlows";
import { APP_ROUTES } from "@/lib/appRoutes";

describe("advertised sticky flows", () => {
  it("defines the five advertised flows in order", () => {
    const flows = getAdvertisedFlows();

    expect(flows.map((flow) => flow.id)).toEqual(ADVERTISED_FLOW_IDS);
    expect(flows.map((flow) => flow.name)).toEqual([
      "Starting Charge",
      "Read Along Training",
      "Daily Charge",
      "Promise Ledger",
      "Proof Loop",
    ]);
  });

  it("calculates status and proof metrics from local-first state", () => {
    const flows = getAdvertisedFlows({
      hasStartingCharge: true,
      readAlongProgressPercent: 44,
      dailyChargeComplete: true,
      selfTrustLevel: 3,
      keptPromises: 10,
      recoveryWins: 2,
      proofCount: 4,
    });

    expect(flows.find((flow) => flow.id === "starting_charge")).toMatchObject({
      status: "complete",
      route: APP_ROUTES.quickStart,
    });
    expect(flows.find((flow) => flow.id === "read_along")).toMatchObject({
      status: "in_progress",
      route: APP_ROUTES.readAlong,
      proofMetric: "44% complete",
    });
    expect(flows.find((flow) => flow.id === "daily_charge")?.status).toBe("complete");
    expect(flows.find((flow) => flow.id === "promise_ledger")?.proofMetric).toBe(
      "Self-Trust L3 · 10 kept · 2 recovered",
    );
    expect(flows.find((flow) => flow.id === "proof_loop")?.proofMetric).toBe("4 proof cards");
  });

  it("marks completed read along at 100 percent", () => {
    const readAlong = getAdvertisedFlows({ readAlongProgressPercent: 100 }).find(
      (flow) => flow.id === "read_along",
    );

    expect(readAlong?.status).toBe("complete");
  });
});
