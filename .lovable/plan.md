
# Subscription Pricing Migration: $9.99/month or $79.99/year

## Overview
Migrating from one-time payment ($29/$49) to a subscription model with two tiers:
- **Monthly**: $9.99/month
- **Yearly**: $79.99/year (saves ~33%)

This requires changes to Stripe configuration, backend edge functions, frontend pricing logic, and all UI components displaying pricing.

---

## Step 1: Create Stripe Products and Prices

New Stripe prices need to be created:

| Plan | Price | Interval | Savings |
|------|-------|----------|---------|
| Monthly | $9.99 | month | - |
| Yearly | $79.99 | year | ~$40/year (33% off) |

I'll use the Stripe tools to create a new product "The Dashboard - Full Access Subscription" with both pricing tiers.

---

## Step 2: Update Pricing Configuration

**File: `src/lib/pricing.ts`**

Replace the one-time pricing model with subscription tiers:

```text
Before:
- PRICE_IDS: { launch, regular }
- getPricing(): returns one-time amounts ($29/$49)
- isLaunchPeriod logic

After:
- PRICE_IDS: { monthly, yearly }
- getPricing(): returns subscription amounts
- getYearlySavings(): calculate discount %
- Remove launch period logic (no longer needed)
```

---

## Step 3: Update Edge Functions

### `supabase/functions/create-checkout/index.ts`
- Change `mode: "payment"` to `mode: "subscription"`
- Accept `plan` parameter (monthly/yearly) from frontend
- Remove launch/regular price logic
- Use the new subscription price IDs

### `supabase/functions/check-payment/index.ts`
- Add `stripe.subscriptions.list()` check for active subscriptions
- Return subscription status, plan type, and renewal date
- Keep backward compatibility for existing one-time purchasers

---

## Step 4: Update Frontend Hook

**File: `src/hooks/useEntitlements.ts`**

```text
Changes:
- Remove isLaunchPeriod() and getPricing() duplicate logic
- Add plan selection state to initiateCheckout(plan: 'monthly' | 'yearly')
- Update response handling to include subscription info
```

---

## Step 5: Update All Pricing UI Components

### Components to Update

| Component | Current Display | New Display |
|-----------|-----------------|-------------|
| `LockedOverlay.tsx` | "$29 one-time. $49 after March 1." | "$9.99/mo or $79.99/yr (save 33%)" |
| `Day7Complete.tsx` | "Unlock Full Access - $29" | Plan selector + pricing |
| `ResetProgressModule.tsx` | "Unlock for $29" | "Unlock Full Access" |
| `AIGuidePanel.tsx` | LaunchCountdownBadge | Subscription pricing |
| `LaunchCountdownBadge.tsx` | DELETE or repurpose | No longer needed |

---

## Step 6: Create Plan Selector Component

**New File: `src/components/PlanSelector.tsx`**

A reusable component for selecting monthly vs yearly:

```text
- Two plan cards side-by-side
- Monthly: "$9.99/mo" 
- Yearly: "$79.99/yr" with "Save 33%" badge
- Visual highlight on yearly (recommended)
- onSelect callback triggers checkout with plan type
```

---

## Step 7: Update Tests

### Unit Tests (`tests/unit/pricing.test.ts`)
- Update to test new subscription pricing values
- Remove launch period tests
- Add yearly savings calculation tests

### E2E Tests (`tests/e2e/pricing-rule.spec.ts`)
- Update price expectations ($29/$49 → $9.99/$79.99)
- Update text matching patterns
- Test plan selection flow

---

## Implementation Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/pricing.ts` | REWRITE | New subscription pricing model |
| `supabase/functions/create-checkout/index.ts` | REWRITE | Subscription mode + plan parameter |
| `supabase/functions/check-payment/index.ts` | UPDATE | Add subscription status check |
| `src/hooks/useEntitlements.ts` | UPDATE | Plan selection, remove duplicate logic |
| `src/components/PlanSelector.tsx` | CREATE | New plan selection UI |
| `src/components/experience/LockedOverlay.tsx` | UPDATE | New pricing display + plan selector |
| `src/components/Day7Complete.tsx` | UPDATE | New pricing CTAs |
| `src/components/dashboard/ResetProgressModule.tsx` | UPDATE | New pricing CTA |
| `src/components/dashboard/AIGuidePanel.tsx` | UPDATE | New pricing display |
| `src/components/LaunchCountdownBadge.tsx` | DELETE | No longer needed |
| `tests/unit/pricing.test.ts` | UPDATE | New pricing expectations |
| `tests/e2e/pricing-rule.spec.ts` | UPDATE | New pricing patterns |

---

## Technical Details

### New Pricing Configuration
```typescript
export const PRICE_IDS = {
  monthly: "price_xxx", // Will be created via Stripe tool
  yearly: "price_yyy",  // Will be created via Stripe tool
} as const;

export const PRICING = {
  monthly: 9.99,
  yearly: 79.99,
  yearlyMonthlyEquivalent: 6.67, // $79.99/12
  yearlySavingsPercent: 33,
} as const;

export const getPricing = () => ({
  monthly: PRICING.monthly,
  yearly: PRICING.yearly,
  yearlySavingsPercent: PRICING.yearlySavingsPercent,
});
```

### Create Checkout Request (Frontend)
```typescript
const initiateCheckout = async (plan: 'monthly' | 'yearly') => {
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { plan }
  });
  // ...
};
```

### Create Checkout Response (Backend)
```typescript
// create-checkout will now:
const priceId = plan === 'yearly' ? YEARLY_PRICE_ID : MONTHLY_PRICE_ID;
const session = await stripe.checkout.sessions.create({
  mode: "subscription", // Changed from "payment"
  line_items: [{ price: priceId, quantity: 1 }],
  // ...
});
```

### Check Payment Response (Backend)
```typescript
// check-payment will now return:
{
  isPaid: true,
  subscriptionStatus: "active", // or "canceled", "past_due"
  plan: "yearly", // or "monthly"
  currentPeriodEnd: "2027-01-26T00:00:00Z",
  source: "stripe"
}
```

---

## Existing Purchaser Handling

Users who already purchased the one-time $29 or $49 will continue to have full access. The `check-payment` function will:

1. First check `user_entitlements` table (existing behavior)
2. Then check for active Stripe subscriptions (new)
3. Finally check for completed one-time payments (existing behavior)

This ensures no disruption for existing paid users.

---

## UI Messaging Examples

### LockedOverlay
> **Unlock Full Access**  
> $9.99/mo or $79.99/yr  
> ✨ Save 33% with yearly

### Day7Complete  
> **Ready for More?**  
> Continue your journey with unlimited Snapshots and The Controllables.  
> [Monthly $9.99/mo] [Yearly $79.99/yr - Save 33%]

### AIGuidePanel Upgrade CTA
> Come back tomorrow for another free message, or unlock unlimited access.  
> [Unlock Full Access]  
> Starting at $9.99/mo
