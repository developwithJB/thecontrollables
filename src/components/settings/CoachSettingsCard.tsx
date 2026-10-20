import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFeatureFlag } from "@/lib/featureFlags";
import {
  loadCoachSettings,
  removeCoachKey,
  saveCoachKey,
  saveCoachPreferences,
  type CoachSettings,
} from "@/data/coach/coachSettings";

export function CoachSettingsCard({ userId }: { userId: string }) {
  const visible = getFeatureFlag("coach_providers_enabled");
  const query = useQuery({
    queryKey: ["coach-settings", userId],
    queryFn: () => loadCoachSettings(userId),
    enabled: visible,
    staleTime: 0,
    gcTime: 0,
  });
  if (!visible || !query.data?.enabled) return null;
  return (
    <CoachSettingsEditor
      key={userId}
      userId={userId}
      settings={query.data.settings}
      refresh={() => query.refetch()}
    />
  );
}
function CoachSettingsEditor({
  userId,
  settings,
  refresh,
}: {
  userId: string;
  settings: CoachSettings | null;
  refresh: () => Promise<unknown>;
}) {
  const [destination, setDestination] = useState(
    settings?.base_url ?? "https://api.openai.com/v1",
  );
  const [model, setModel] = useState(
    settings?.provider !== "lovable_gateway" ? (settings?.model ?? "") : "",
  );
  const [tone, setTone] = useState(settings?.persona_tone ?? "balanced");
  const [depth, setDepth] = useState(settings?.depth ?? "standard");
  const [keyValue, setKeyValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const run = async (
    operation: () => Promise<unknown>,
    containsKey = false,
  ) => {
    setBusy(true);
    setStatus("");
    try {
      await operation();
      if (active.current) {
        await refresh();
        if (active.current) setStatus("Saved.");
      }
    } catch {
      if (active.current) setStatus("Could not save. Please try again.");
    } finally {
      if (active.current) {
        if (containsKey) setKeyValue("");
        setBusy(false);
      }
    }
  };
  const inputClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
  return (
    <section
      aria-label="Coach settings"
      className="ph-no-capture ph-block space-y-4 rounded-lg border border-border/50 bg-muted/30 p-4"
      data-ph-no-capture
      data-private
    >
      <h3 className="font-medium">Coach</h3>
      <p className="text-xs text-muted-foreground">
        No platform AI fee. Bring your own provider key; your provider bills its use. Up to 100 requests/day. Conversation
        text and existing chat context go to the provider you select; private
        Wellness check-ins are excluded. Existing AI memory and consent settings
        still apply. The coach cannot approve content or complete your circuits.
      </p>
      <p className="text-sm">
        Current:{" "}
        {settings?.last4
          ? `${settings.provider === "anthropic" ? "Anthropic" : settings.base_url?.includes("openrouter") ? "OpenRouter" : "OpenAI"} · key ending ${settings.last4}`
          : "Existing app coach · no personal key"}
      </p>
      {settings?.last4 ? <p className="text-xs text-muted-foreground">Current model: {settings.model}</p> : null}
      <div className="space-y-2">
        <Label htmlFor="coach-provider">Provider</Label>
        <select
          id="coach-provider"
          className={inputClass}
          value={destination}
          disabled={busy}
          onChange={(e) => {
            setDestination(e.target.value);
            setKeyValue("");
            setModel("");
          }}
        >
          <option value="https://api.openai.com/v1">OpenAI</option>
          <option value="https://openrouter.ai/api/v1">OpenRouter</option>
          <option value="https://api.anthropic.com">Anthropic</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="coach-model">Model ID</Label>
        <Input
          id="coach-model"
          maxLength={120}
          value={model}
          disabled={busy}
          onChange={(e) => setModel(e.target.value)}
          placeholder="A model available to your provider account"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="coach-key">New API key</Label>
        <Input
          id="coach-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          maxLength={512}
          value={keyValue}
          disabled={busy}
          onChange={(e) => setKeyValue(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Stored encrypted. After saving, only the last four characters are
          shown. Enter a new key when switching provider.
        </p>
      </div>
      <Button
        disabled={busy || !keyValue || !/^[A-Za-z0-9._:/-]{1,120}$/.test(model)}
        onClick={() =>
          void run(
            () =>
              saveCoachKey(userId, {
                provider:
                  destination === "https://api.anthropic.com"
                    ? "anthropic"
                    : "openai_compatible",
                key: keyValue,
                baseUrl: destination,
                model,
              }),
            true,
          )
        }
      >
        Save provider key
      </Button>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="coach-tone">Tone</Label>
          <select
            id="coach-tone"
            className={inputClass}
            value={tone}
            disabled={busy}
            onChange={(e) => setTone(e.target.value)}
          >
            {["balanced", "warm", "direct"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="coach-depth">Depth</Label>
          <select
            id="coach-depth"
            className={inputClass}
            value={depth}
            disabled={busy}
            onChange={(e) => setDepth(e.target.value)}
          >
            {["concise", "standard", "detailed"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="futureOutline"
          disabled={busy}
          onClick={() =>
            void run(() =>
              saveCoachPreferences(
                userId,
                settings?.last4
                  ? destination === settings.base_url ? model || settings.model : settings.model
                  : "google/gemini-2.5-flash",
                tone,
                depth,
              ),
            )
          }
        >
          Save preferences
        </Button>
        {settings?.last4 ? (
          <Button
            variant="futureOutline"
            disabled={busy}
            onClick={() => void run(() => removeCoachKey(userId), true)}
          >
            Remove key
          </Button>
        ) : null}
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {busy ? "Saving…" : status}
      </p>
    </section>
  );
}
