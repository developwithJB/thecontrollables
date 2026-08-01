import { useCallback } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { formationAnalyticsEnabled } from "@/lib/featureFlags";
import {
  validateFormationAnalyticsEvent,
  type FormationAnalyticsProperties,
  type FormationEventName,
} from "@/lib/formationAnalytics";

export function useFormationAnalytics() {
  const { trackEvent } = useAnalytics();
  return useCallback((name: FormationEventName, properties: FormationAnalyticsProperties = {}) => {
    if (!formationAnalyticsEnabled()) return Promise.resolve();
    const event = validateFormationAnalyticsEvent({ name, properties });
    return trackEvent("formation", event.name, event.properties);
  }, [trackEvent]);
}

