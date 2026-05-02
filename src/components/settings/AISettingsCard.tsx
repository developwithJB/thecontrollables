import { Brain, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAIMemories, useAIConsents, useAIOperatorActions } from "@/hooks/useAIOperator";
import { useOnboarding } from "@/hooks/useOnboarding";
import { getConsentCopy, type AIConsentKey } from "@/lib/aiOperator";

interface AISettingsCardProps {
  userId: string;
  onRevisitStart?: () => void;
}

const PRIMARY_CONSENTS: AIConsentKey[] = [
  "calendar_context",
  "body_context",
  "money_context",
  "email_summary_context",
  "memory_enabled",
];

const PROACTIVE_CONSENTS: AIConsentKey[] = [
  "push_nudges_enabled",
  "email_nudges_enabled",
];

export function AISettingsCard({ userId, onRevisitStart }: AISettingsCardProps) {
  const navigate = useNavigate();
  const [memoryOpen, setMemoryOpen] = useState(false);
  const consents = useAIConsents(userId);
  const memories = useAIMemories(userId);
  const { updateConsents, archiveMemory } = useAIOperatorActions(userId);
  const { resetDailyOperatorOnboarding, isResettingDailyOperatorOnboarding } = useOnboarding(userId);
  const consentValues = consents.data;

  const renderConsent = (key: AIConsentKey) => {
    const copy = getConsentCopy(key);
    return (
      <div key={key} className="flex items-start justify-between gap-3 rounded-md bg-muted/40 px-3 py-3">
        <div className="space-y-0.5">
          <Label htmlFor={`ai-${key}`} className="text-sm font-medium cursor-pointer">
            {copy.label}
          </Label>
          <p className="text-xs text-muted-foreground leading-relaxed">{copy.description}</p>
        </div>
        <Switch
          id={`ai-${key}`}
          checked={consentValues?.[key] === true}
          disabled={updateConsents.isPending || consents.isLoading}
          onCheckedChange={(checked) => updateConsents.mutate({ [key]: checked })}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-muted-foreground" />
        <Label className="font-medium">Daily Operator AI</Label>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Choose what the Operator can use when it creates daily briefs, suggestions, and follow-ups.
        Planner and Growth basics are always used to run the core app.
      </p>

      <div className="rounded-md bg-background/60 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">First-day setup</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Revisit the quick setup that teaches the Operator how to shape today.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await resetDailyOperatorOnboarding();
              onRevisitStart?.();
              navigate("/home");
            }}
            disabled={isResettingDailyOperatorOnboarding}
            className="shrink-0"
          >
            Revisit
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {PRIMARY_CONSENTS.map(renderConsent)}
      </div>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between px-3 h-9 text-sm">
            <span>Proactive nudges</span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          {PROACTIVE_CONSENTS.map(renderConsent)}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={memoryOpen} onOpenChange={setMemoryOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between px-3 h-9 text-sm">
            <span>Operator Memory ({memories.data?.length || 0})</span>
            {memoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          {!consentValues?.memory_enabled ? (
            <p className="text-xs text-muted-foreground/80 px-3 py-2">
              Memory is off. Turn it on before the Operator stores preferences.
            </p>
          ) : memories.isLoading ? (
            <p className="text-xs text-muted-foreground/80 px-3 py-2">Loading memories...</p>
          ) : !memories.data?.length ? (
            <p className="text-xs text-muted-foreground/80 px-3 py-2">
              No memories saved yet. Approved actions and feedback will teach the Operator over time.
            </p>
          ) : (
            <div className="space-y-2">
              {memories.data.map((memory) => (
                <div key={memory.id} className="flex items-start justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{memory.domain}</p>
                    <p className="text-xs text-foreground leading-relaxed">{memory.content}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => archiveMemory.mutate(memory.id)}
                    title="Forget this memory"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <p className="text-[10px] text-muted-foreground/70">
        You can turn any source off later. Future briefs stop using that source immediately.
      </p>
    </div>
  );
}
