import { supabase } from "@/integrations/supabase/client";
import type { FormationProofReference, TrainingTrack } from "@/domain/formation/circuits";
import {
  FORMATION_PROOF_BUCKET,
  buildFormationProofPath,
  isOwnerScopedProofPath,
  validateFormationProofFile,
} from "./formationProofPolicy";

export {
  FORMATION_PROOF_BUCKET,
  MAX_FORMATION_PROOF_BYTES,
  buildFormationProofPath,
  isOwnerScopedProofPath,
  validateFormationProofFile,
} from "./formationProofPolicy";

export async function sanitizeFormationProof(file: File): Promise<{ blob: Blob; previewUrl: string }> {
  const validationError = validateFormationProofFile(file);
  if (validationError) throw new Error(validationError);

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Image preparation is unavailable in this browser.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await canvasToBlob(canvas);
    return { blob, previewUrl: URL.createObjectURL(blob) };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadFormationProof(input: {
  userId: string;
  localDate: string;
  track: TrainingTrack;
  sanitizedBlob: Blob;
  localOnly: boolean;
}): Promise<FormationProofReference> {
  const assetId = crypto.randomUUID();
  const storagePath = buildFormationProofPath(input.userId, assetId);
  const createdAt = new Date().toISOString();

  if (input.localOnly) {
    return {
      id: assetId,
      storagePath,
      previewUrl: await blobToDataUrl(input.sanitizedBlob),
      createdAt,
      localOnly: true,
    };
  }

  const { error: uploadError } = await supabase.storage
    .from(FORMATION_PROOF_BUCKET)
    .upload(storagePath, input.sanitizedBlob, {
      contentType: "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { error: metadataError } = await supabase.from("formation_proof_assets").insert({
    id: assetId,
    user_id: input.userId,
    local_date: input.localDate,
    track: input.track,
    circuit_type: "habit",
    storage_path: storagePath,
    mime_type: "image/jpeg",
    byte_size: input.sanitizedBlob.size,
    visibility: "private",
  });

  if (metadataError) {
    await supabase.storage.from(FORMATION_PROOF_BUCKET).remove([storagePath]);
    throw metadataError;
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from(FORMATION_PROOF_BUCKET)
    .createSignedUrl(storagePath, 10 * 60);
  if (signedUrlError) throw signedUrlError;

  return { id: assetId, storagePath, previewUrl: data.signedUrl, createdAt, localOnly: false };
}

export async function refreshFormationProofPreview(
  proof: FormationProofReference,
): Promise<FormationProofReference> {
  if (proof.localOnly || proof.previewUrl.startsWith("data:")) return proof;
  const { data, error } = await supabase.storage
    .from(FORMATION_PROOF_BUCKET)
    .createSignedUrl(proof.storagePath, 10 * 60);
  if (error) return { ...proof, previewUrl: "" };
  return { ...proof, previewUrl: data.signedUrl };
}

export async function deleteFormationProof(
  userId: string,
  proof: FormationProofReference,
): Promise<void> {
  if (!isOwnerScopedProofPath(userId, proof.storagePath)) throw new Error("Proof path is not owned by this account.");
  if (proof.localOnly) return;

  const { error: storageError } = await supabase.storage
    .from(FORMATION_PROOF_BUCKET)
    .remove([proof.storagePath]);
  if (storageError) throw storageError;

  const { error: metadataError } = await supabase
    .from("formation_proof_assets")
    .delete()
    .eq("id", proof.id)
    .eq("user_id", userId);
  if (metadataError) throw metadataError;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The image could not be decoded."));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The image could not be safely re-encoded."))),
      "image/jpeg",
      0.84,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The image preview could not be stored locally."));
    reader.readAsDataURL(blob);
  });
}
