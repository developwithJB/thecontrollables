import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EntitlementStatus {
  isPaid: boolean;
  isLoading: boolean;
}

/**
 * Hook to check user entitlement status (free vs paid).
 * 
 * Free users CAN use:
 * - Build Overview (assessment + archetype)
 * - XP Momentum (earning and viewing current XP/level)
 * - Time Currency (daily logging and today's view)
 * - Integrity Meter (making and resolving promises)
 * 
 * Free users CANNOT fully access:
 * - Experience History (progress trends, reset history, badge history, momentum decay)
 */
export function useEntitlements(userId: string | null): EntitlementStatus {
  const [isPaid, setIsPaid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    // For now, all users are free tier
    // TODO: Integrate with payment provider (Stripe) to check subscription status
    // This could check a `subscriptions` table or call an edge function
    const checkPaidStatus = async () => {
      try {
        // Future: Check subscription status from database
        // const { data } = await supabase
        //   .from("subscriptions")
        //   .select("status")
        //   .eq("user_id", userId)
        //   .eq("status", "active")
        //   .single();
        // setIsPaid(!!data);
        
        setIsPaid(false); // Default to free tier
      } catch (error) {
        console.error("Error checking entitlement:", error);
        setIsPaid(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPaidStatus();
  }, [userId]);

  return { isPaid, isLoading };
}

// Feature flags for entitlements
export const PAID_FEATURES = {
  progressHistory: true,
  resetHistory: true,
  badgesEarned: true,
  momentumDecay: true,
} as const;

export type PaidFeature = keyof typeof PAID_FEATURES;
