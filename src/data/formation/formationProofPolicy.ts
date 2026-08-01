export const FORMATION_PROOF_BUCKET = "formation-proof";
export const MAX_FORMATION_PROOF_BYTES = 5 * 1024 * 1024;
const ACCEPTED_INPUT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export interface ProofFileMetadata {
  type: string;
  size: number;
  name: string;
}

export function validateFormationProofFile(file: ProofFileMetadata): string | null {
  if (!ACCEPTED_INPUT_TYPES.includes(file.type as (typeof ACCEPTED_INPUT_TYPES)[number])) {
    return "Choose a JPEG, PNG, or WebP image.";
  }
  if (file.size <= 0 || file.size > MAX_FORMATION_PROOF_BYTES) {
    return "Choose an image smaller than 5 MB.";
  }
  if (!file.name || file.name.length > 240) {
    return "Choose an image with a valid file name.";
  }
  return null;
}

export function buildFormationProofPath(userId: string, assetId: string): string {
  const safeUserId = userId.replace(/[^a-zA-Z0-9-]/g, "");
  const safeAssetId = assetId.replace(/[^a-zA-Z0-9-]/g, "");
  if (!safeUserId || !safeAssetId) throw new Error("Invalid proof path");
  return `${safeUserId}/${safeAssetId}.jpg`;
}

export function isOwnerScopedProofPath(userId: string, storagePath: string): boolean {
  return storagePath.startsWith(`${userId}/`) && !storagePath.includes("..") && !storagePath.startsWith("/");
}
