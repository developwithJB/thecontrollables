import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface EntitlementStatus {
  isPaid: boolean;
  isLoading: boolean;
  purchasedAt: string | null;
  checkPaymentStatus: () => void;
  initiateCheckout: () => Promise<void>;
  isCheckingOut: boolean;
}

// Launch pricing configuration
const LAUNCH_END_DATE = new Date("2025-03-01T00:00:00Z");

export const isLaunchPeriod = () => new Date() < LAUNCH_END_DATE;

export const getPricing = () => ({
  amount: isLaunchPeriod() ? 29 : 49,
  launchAmount: 29,
  regularAmount: 49,
  isLaunchPeriod: isLaunchPeriod(),
  launchEndDate: LAUNCH_END_DATE,
});

/**
 * Hook to check user entitlement status (free vs paid).
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

  // Query to check payment status via Stripe
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["payment-status", userId],
    queryFn: async () => {
      if (!userId) return { isPaid: false, purchasedAt: null };
      
      try {
        const { data: result, error } = await supabase.functions.invoke("check-payment");
        
        if (error) {
          console.error("Error checking payment status:", error);
          return { isPaid: false, purchasedAt: null };
        }
        
        return {
          isPaid: result?.isPaid ?? false,
          purchasedAt: result?.purchasedAt ?? null,
        };
      } catch (error) {
        console.error("Error checking payment status:", error);
        return { isPaid: false, purchasedAt: null };
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
        description: "AI Companions and Experience History are now unlocked.",
        duration: 5000,
      });
      // Refetch payment status
      refetch();
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (paymentStatus === "canceled") {
      toast("Payment canceled", {
        description: "No worries—you can upgrade anytime.",
        duration: 3000,
      });
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refetch]);

  const checkPaymentStatus = useCallback(() => {
    refetch();
  }, [refetch]);

  const initiateCheckout = useCallback(async () => {
    if (!userId) {
      toast.error("Please sign in to upgrade");
      return;
    }

    setIsCheckingOut(true);
    
    try {
      const { data: result, error } = await supabase.functions.invoke("create-checkout");
      
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

  return {
    isPaid: data?.isPaid ?? false,
    isLoading,
    purchasedAt: data?.purchasedAt ?? null,
    checkPaymentStatus,
    initiateCheckout,
    isCheckingOut,
  };
}

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
