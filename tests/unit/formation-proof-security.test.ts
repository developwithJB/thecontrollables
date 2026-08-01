import { describe, expect, it } from "vitest";
import {
  FORMATION_PROOF_BUCKET,
  MAX_FORMATION_PROOF_BYTES,
  buildFormationProofPath,
  isOwnerScopedProofPath,
  validateFormationProofFile,
} from "@/data/formation/formationProofPolicy";

describe("formation proof upload security", () => {
  it("uses the dedicated non-public bucket contract", () => {
    expect(FORMATION_PROOF_BUCKET).toBe("formation-proof");
  });

  it("accepts supported image inputs within the limit", () => {
    expect(validateFormationProofFile({ type: "image/png", size: 1024, name: "proof.png" })).toBeNull();
  });

  it("rejects unsupported types, empty files, and oversized files", () => {
    expect(validateFormationProofFile({ type: "image/svg+xml", size: 1024, name: "proof.svg" })).toContain("JPEG");
    expect(validateFormationProofFile({ type: "image/jpeg", size: 0, name: "empty.jpg" })).toContain("5 MB");
    expect(validateFormationProofFile({ type: "image/jpeg", size: MAX_FORMATION_PROOF_BYTES + 1, name: "large.jpg" })).toContain("5 MB");
  });

  it("builds opaque owner-scoped paths and rejects traversal", () => {
    const path = buildFormationProofPath("user-123", "asset-456");
    expect(path).toBe("user-123/asset-456.jpg");
    expect(isOwnerScopedProofPath("user-123", path)).toBe(true);
    expect(isOwnerScopedProofPath("other-user", path)).toBe(false);
    expect(isOwnerScopedProofPath("user-123", "user-123/../other.jpg")).toBe(false);
  });
});
