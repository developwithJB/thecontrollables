import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getPricing, type PlanType } from "@/lib/pricing";

interface SubscriptionInfo {
  isPaid: boolean;
  plan: PlanType | "lifetime" | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  purchasedAt: string | null;
}

interface EntitlementStatus {
  isPaid: boolean;
  isLoading: boolean;
  purchasedAt: string | null;
  plan: PlanType | "lifetime" | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  checkPaymentStatus: () => void;
  initiateCheckout: (plan?: PlanType) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  isCheckingOut: boolean;
  isOpeningPortal: boolean;
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
  const queryClient = useQueryClient();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  // Query to check payment status via Stripe
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["payment-status", userId],
    queryFn: async (): Promise<SubscriptionInfo> => {
      if (!userId) return { 
        isPaid: false, 
        purchasedAt: null, 
        plan: null, 
        subscriptionStatus: null, 
        currentPeriodEnd: null 
      };
      
      try {
        const { data: result, error } = await supabase.functions.invoke("check-payment");
        
        if (error) {
          console.error("Error checking payment status:", error);
          return { 
            isPaid: false, 
            purchasedAt: null, 
            plan: null, 
            subscriptionStatus: null, 
            currentPeriodEnd: null 
          };
        }
        
        return {
          isPaid: result?.isPaid ?? false,
          purchasedAt: result?.purchasedAt ?? null,
          plan: result?.plan ?? null,
          subscriptionStatus: result?.subscriptionStatus ?? null,
          currentPeriodEnd: result?.currentPeriodEnd ?? null,
        };
      } catch (error) {
        console.error("Error checking payment status:", error);
        return { 
          isPaid: false, 
          purchasedAt: null, 
          plan: null, 
          subscriptionStatus: null, 
          currentPeriodEnd: null 
        };
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: true,
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
      // Refetch payment status
      refetch();
      // Clean up URL
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

  const initiateCheckout = useCallback(async (plan: PlanType = "yearly") => {
    if (!userId) {
      toast.error("Please sign in to subscribe");
      return;
    }

    setIsCheckingOut(true);
    
    try {
      const { data: result, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan }
      });
      
      if (error) {
        throw new Error(error.message || "Failed to create checkout session");
      }
      
      if (result?.error) {
        toast.info(result.error);
        setIsCheckingOut(false);
        return;
      }
      
      if (result?.url) {
        // Redirect in same tab to avoid popup blockers on mobile
        window.location.href = result.url;
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
      const { data: result, error } = await supabase.functions.invoke("customer-portal");
      
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
    plan: data?.plan ?? null,
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
