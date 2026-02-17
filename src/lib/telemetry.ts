import posthog from "posthog-js";
import * as Sentry from "@sentry/react";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/lib/version";
import { setupGlobalErrorTracking } from "@/hooks/useAnalytics";

const getPlanTier = (user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }) => {
  const metadataTier = user.app_metadata?.plan_tier ?? user.user_metadata?.plan_tier;
  if (typeof metadataTier === "string" && metadataTier.length > 0) return metadataTier;
  return "free";
};

export const initTelemetry = () => {
  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  const posthogHost = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      capture_pageview: false,
      persistence: "localStorage+cookie",
      autocapture: true,
      loaded: () => {
        posthog.register({ app_version: APP_VERSION });
      },
    });
  }

  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      release: APP_VERSION,
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    });
  }

  setupGlobalErrorTracking();

  supabase.auth.getSession().then(({ data }) => {
    const user = data.session?.user;
    if (!user) return;
    const planTier = getPlanTier(user);
    posthog.identify(user.id, { plan_tier: planTier });
    Sentry.setUser({ id: user.id });
    Sentry.setTag("plan_tier", planTier);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    if (!user) {
      posthog.reset();
      Sentry.setUser(null);
      Sentry.setTag("plan_tier", "free");
      return;
    }

    const planTier = getPlanTier(user);
    posthog.identify(user.id, { plan_tier: planTier });
    Sentry.setUser({ id: user.id });
    Sentry.setTag("plan_tier", planTier);
  });
};
