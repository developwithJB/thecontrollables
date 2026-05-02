import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { type PlanTier as CheckoutPlanTier } from "@/lib/pricing";
import { type PlanTier as EntitlementPlanTier } from "@/lib/entitlements";
import { withTimeout } from "@/lib/withTimeout";

interface SubscriptionInfo {
  isPaid: boolean;
  planTier: EntitlementPlanTier | null;
  // Backward compatibility alias
  plan?: EntitlementPlanTier | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  purchasedAt: string | null;
}

interface EntitlementStatus {
  isPaid: boolean;
  isLoading: boolean;
  purchasedAt: string | null;
  planTier: EntitlementPlanTier | null;
  // Backward compatibility alias
  plan?: EntitlementPlanTier | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  checkPaymentStatus: () => void;
  initiateCheckout: (tier?: CheckoutPlanTier, options?: CheckoutStartOptions) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  isCheckingOut: boolean;
  isOpeningPortal: boolean;
}

interface CheckoutStartOptions {
  source?: string;
  successPath?: string;
  cancelPath?: string;
}

interface CheckoutResponsePayload {
  url?: string | null;
  error?: string;
  message?: string;
  error_code?: string;
  portal_url?: string | null;
}

interface ParsedFunctionError {
  code: string | null;
  message: string;
  portalUrl: string | null;
}

// Timeout for edge function calls (15 seconds)
const EDGE_FUNCTION_TIMEOUT = 15000;

// LocalStorage key for caching entitlement status
const ENTITLEMENT_CACHE_KEY = 'entitlement_cache_';

const sanitizeCheckoutSource = (source?: string): string | undefined => {
  if (!source) return undefined;
  const normalized = source.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return normalized ? normalized.slice(0, 64) : undefined;
};

const parseCheckoutPayload = (payload: unknown): ParsedFunctionError => {
  if (!payload || typeof payload !== "object") {
    return { code: null, message: "Unable to start checkout right now.", portalUrl: null };
  }

  const record = payload as Record<string, unknown>;
  const rawMessage = record.message ?? record.error;
  const message =
    typeof rawMessage === "string" && rawMessage.trim().length > 0
      ? rawMessage
      : "Unable to start checkout right now.";
  const code = typeof record.error_code === "string" ? record.error_code : null;
  const portalUrl = typeof record.portal_url === "string" ? record.portal_url : null;

  return { code, message, portalUrl };
};

const parseInvokeError = async (error: unknown): Promise<ParsedFunctionError> => {
  const fallbackMessage =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : "Unable to start checkout right now.";
  const fallback: ParsedFunctionError = {
    code: null,
    message: fallbackMessage,
    portalUrl: null,
  };

  if (!error || typeof error !== "object") return fallback;
  const context = (error as { context?: unknown }).context;
  if (!(context instanceof Response)) return fallback;

  try {
    const parsed = parseCheckoutPayload(await context.clone().json());
    if (parsed.message === "Unable to start checkout right now.") {
      parsed.message = fallbackMessage;
    }
    if (!parsed.code && context.status === 409) {
      parsed.code = "already_subscribed";
    }
    return parsed;
  } catch {
    return fallback;
  }
};

function cacheEntitlement(userId: string, info: SubscriptionInfo): void {
  try {
    localStorage.setItem(ENTITLEMENT_CACHE_KEY + userId, JSON.stringify(info));
  } catch {
    // ignore storage errors
  }
}

function getCachedEntitlement(userId: string): SubscriptionInfo {
  try {
    const cached = localStorage.getItem(ENTITLEMENT_CACHE_KEY + userId);
    if (cached) {
      const parsed = JSON.parse(cached) as SubscriptionInfo;
      // Only trust cache if user was paid (prevents false upgrades)
      if (parsed.isPaid) {
        console.log("[useEntitlements] Using cached paid status for", userId);
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return { isPaid: false, purchasedAt: null, planTier: null, subscriptionStatus: null, currentPeriodEnd: null };
}

/**
 * Hook to check user entitlement status (free vs paid subscription).
 * 
 * Free users CAN use:
 * - Build Overview (assessment + archetype)
 * - XP Momentum (earning and viewing current XP/level)
 * - Time Currency (daily logging and today's view)
 * - Integrity Meter (making and resolving promises)
 * - 7-Day Snapshot (full functionality)
 * 
 * Free users CANNOT fully access:
 * - Experience History (progress trends, reset history, badge history, momentum decay)
 * - AI Companions (AI Operators panel)
 */
export function useEntitlements(userId: string | null): EntitlementStatus {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  // Query to check payment status via Stripe
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["payment-status", userId],
    queryFn: async (): Promise<SubscriptionInfo> => {
      if (!userId) return { 
        isPaid: false, 
        purchasedAt: null, 
        planTier: null, 
        subscriptionStatus: null, 
        currentPeriodEnd: null 
      };
      
      try {
        // Use cached session (instant, no network call) to check auth
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          // No session at all - return cached or default
          return getCachedEntitlement(userId);
        }

        const { data: result, error } = await withTimeout(
          supabase.functions.invoke("check-payment"),
          EDGE_FUNCTION_TIMEOUT,
          "Payment check timed out. Please refresh the page."
        );
        
        if (error) {
          console.error("Error checking payment status:", error);
          return getCachedEntitlement(userId);
        }
        
        const info: SubscriptionInfo = {
          isPaid: (result?.plan_tier ?? null) !== null,
          purchasedAt: result?.purchasedAt ?? null,
          planTier: result?.plan_tier ?? null,
          subscriptionStatus: result?.subscriptionStatus ?? null,
          currentPeriodEnd: result?.currentPeriodEnd ?? null,
        };
        
        // Cache successful result to localStorage
        cacheEntitlement(userId, info);
        
        return info;
      } catch (error: unknown) {
        // Handle AbortError gracefully (React Query query cancellation)
        if (error instanceof Error && error.name === "AbortError") {
          console.log("[useEntitlements] Query aborted, using cache");
        } else {
          console.error("Error checking payment status:", error);
        }
        return getCachedEntitlement(userId);
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: true,
    retry: 3, // Retry failed requests 3 times (important for iOS PWA resume)
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Check for payment success/cancel URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    
    if (paymentStatus === "success") {
      toast.success("Welcome to Full Access! 🎉", {
        description: "The Controllables and Experience History are now unlocked.",
        duration: 5000,
      });
      
      // Retry check-payment with delays to handle Stripe webhook timing
      // This addresses the race condition where Stripe may not have processed the payment yet
      const retryCheck = async (attempts = 3) => {
        for (let i = 0; i < attempts; i++) {
          // Incremental delay: 1s, 2s, 3s
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          const result = await refetch();
          if ((result.data?.planTier ?? null) !== null) {
            console.log("[useEntitlements] Payment verified on attempt", i + 1);
            break;
          }
        }
      };
      retryCheck();
      
      // Clean up URL immediately
      window.history.replaceState({}, "", window.location.pathname);
    } else if (paymentStatus === "canceled") {
      toast("Checkout canceled", {
        description: "No worries—you can subscribe anytime.",
        duration: 3000,
      });
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refetch]);

  const checkPaymentStatus = useCallback(() => {
    refetch();
  }, [refetch]);

  const initiateCheckout = useCallback(async (tier: CheckoutPlanTier = "pro", options?: CheckoutStartOptions) => {
    if (!userId) {
      toast.error("Please sign in to subscribe");
      return;
    }

    setIsCheckingOut(true);
    
    try {
      const { data: result, error } = await withTimeout(
        supabase.functions.invoke("create-checkout", {
          body: {
            tier,
            source: sanitizeCheckoutSource(options?.source),
            success_path: options?.successPath,
            cancel_path: options?.cancelPath,
          },
        }),
        EDGE_FUNCTION_TIMEOUT,
        "Checkout request timed out. Please try again."
      );
      
      if (error) {
        const parsed = await parseInvokeError(error);
        if (parsed.code === "already_subscribed") {
          toast.info("Subscription already active", {
            description: parsed.message,
          });
          setIsCheckingOut(false);
          window.location.href = parsed.portalUrl || "/billing";
          return;
        }
        throw new Error(parsed.message || "Failed to create checkout session");
      }

      const checkoutPayload = (result ?? {}) as CheckoutResponsePayload;
      const hasPayloadError =
        typeof checkoutPayload.error === "string" ||
        typeof checkoutPayload.message === "string" ||
        typeof checkoutPayload.error_code === "string";

      if (hasPayloadError) {
        const parsed = parseCheckoutPayload(checkoutPayload);
        if (parsed.code === "already_subscribed") {
          toast.info("Subscription already active", {
            description: parsed.message,
          });
          setIsCheckingOut(false);
          window.location.href = parsed.portalUrl || "/billing";
          return;
        }

        toast.error("Unable to start checkout", {
          description: parsed.message,
        });
        setIsCheckingOut(false);
        return;
      }
      
      if (checkoutPayload.url) {
        // Redirect in same tab to avoid popup blockers on mobile
        window.location.href = checkoutPayload.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout", {
        description: error instanceof Error ? error.message : "Please try again",
      });
      setIsCheckingOut(false);
    }
  }, [userId]);

  const openCustomerPortal = useCallback(async () => {
    if (!userId) {
      toast.error("Please sign in to manage your subscription");
      return;
    }

    setIsOpeningPortal(true);
    
    try {
      const { data: result, error } = await withTimeout(
        supabase.functions.invoke("customer-portal"),
        EDGE_FUNCTION_TIMEOUT,
        "Portal request timed out. Please try again."
      );
      
      if (error) {
        throw new Error(error.message || "Failed to open customer portal");
      }
      
      // Handle case where user has manual entitlement (no Stripe customer)
      if (result?.error === "no_stripe_customer") {
        toast.info("Manual Access Granted", {
          description: result.message || "Your access was granted manually—no subscription to manage.",
        });
        setIsOpeningPortal(false);
        return;
      }
      
      if (result?.error) {
        toast.error(result.error);
        setIsOpeningPortal(false);
        return;
      }
      
      if (result?.url) {
        window.location.href = result.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error) {
      console.error("Customer portal error:", error);
      toast.error("Failed to open subscription management", {
        description: error instanceof Error ? error.message : "Please try again",
      });
      setIsOpeningPortal(false);
    }
  }, [userId]);

  return {
    isPaid: data?.isPaid ?? false,
    isLoading,
    purchasedAt: data?.purchasedAt ?? null,
    planTier: data?.planTier ?? null,
    plan: data?.planTier ?? null,
    subscriptionStatus: data?.subscriptionStatus ?? null,
    currentPeriodEnd: data?.currentPeriodEnd ?? null,
    checkPaymentStatus,
    initiateCheckout,
    openCustomerPortal,
    isCheckingOut,
    isOpeningPortal,
  };
}

// Re-export pricing utilities for convenience
export { getPricing } from "@/lib/pricing";

// Feature flags for entitlements
export const PAID_FEATURES = {
  progressHistory: true,
  resetHistory: true,
  badgesEarned: true,
  momentumDecay: true,
  aiCompanions: true,
  certificateDownload: true,
  multipleResets: true,
} as const;

export type PaidFeature = keyof typeof PAID_FEATURES;
