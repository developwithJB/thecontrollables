import { useCallback, useEffect, useState } from "react";
import { loadFormationCompletion, saveFormationCompletionReflection } from "@/data/formation/completionRepository";
import type {
  CompletionNextStep,
  FormationCompletionRecord,
  FormationCompletionReflection,
} from "@/domain/formation/completion";
import type { TrainingTrack } from "@/domain/formation/circuits";

export function useFormationCompletion(userId: string, track: TrainingTrack, allowPreview: boolean) {
  const [record, setRecord] = useState<FormationCompletionRecord | null>(null);
  const [reflection, setReflection] = useState<FormationCompletionReflection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    loadFormationCompletion({ userId, track, allowPreview })
      .then((value) => {
        if (!active) return;
        setRecord(value.record);
        setReflection(value.reflection);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Completion record could not be loaded.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [allowPreview, track, userId]);

  const saveReflection = useCallback(async (
    answers: FormationCompletionReflection["answers"],
    nextStep: CompletionNextStep | null,
  ) => {
    if (!record) throw new Error("No completion record is available.");
    setIsSaving(true);
    setError(null);
    try {
      const saved = await saveFormationCompletionReflection(record, answers, nextStep);
      setReflection(saved);
      return saved;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Reflection could not be saved.");
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, [record]);

  return { record, reflection, isLoading, isSaving, error, saveReflection };
}

