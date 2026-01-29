

# Harden Stripe Production Purchase Flow

## Current State Assessment

After thorough analysis of the payment flow, the core infrastructure is **solid**:

| Component | Status | Notes |
|-----------|--------|-------|
| Stripe Products/Prices | ✅ Correct | Monthly `price_1Sty37...` ($9.99), Yearly `price_1Sty3R...` ($79.99) |
| create-checkout | ✅ Working | Tested via API call, returns valid Stripe URL |
| check-payment | ✅ Working | Returns correct paid/unpaid status |
| customer-portal | ✅ Working | Handles manual entitlements gracefully |
| Unit Tests | ✅ Complete | Pricing and entitlement logic covered |
| E2E Tests | ✅ Good | Checkout, payment success, paywall flows |

## Issues to Fix

### 1. CORS Headers Incomplete
The current CORS headers are missing Supabase SDK-specific headers that can cause failures on some browsers/devices:

```typescript
// Current (incomplete)
"authorization, x-client-info, apikey, content-type"

// Required (complete)
"authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```

### 2. Missing Timeout on Payment Edge Functions
The `useEntitlements` hook doesn't wrap edge function calls with the `withTimeout` utility, risking hanging UI during network issues.

### 3. Missing customer-portal in config.toml
The `customer-portal` function is not listed in `supabase/config.toml`, which could cause JWT verification issues.

### 4. No Retry Logic for check-payment on Initial Load
If the initial payment check fails due to network, the user might appear as "free" when they're actually paid.

### 5. Race Condition on Payment Success
When redirecting back from Stripe with `?payment=success`, the check-payment call races with Stripe's subscription activation. Need a short delay or retry mechanism.

---

## Technical Changes

### 1. Update CORS Headers (All Payment Edge Functions)

**Files:**
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/check-payment/index.ts`
- `supabase/functions/customer-portal/index.ts`

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

---

### 2. Add customer-portal to config.toml

**File:** `supabase/config.toml`

```toml
[functions.customer-portal]
verify_jwt = false
```

---

### 3. Add Timeout Wrapper to useEntitlements

**File:** `src/hooks/useEntitlements.ts`

Wrap edge function calls with `withTimeout` to prevent hanging:

```typescript
import { withTimeout } from "@/lib/withTimeout";

// In queryFn:
const { data: result, error } = await withTimeout(
  supabase.functions.invoke("check-payment"),
  15000, // 15 second timeout
  "Payment check timed out. Please refresh."
);

// In initiateCheckout:
const { data: result, error } = await withTimeout(
  supabase.functions.invoke("create-checkout", { body: { plan } }),
  15000,
  "Checkout request timed out. Please try again."
);

// In openCustomerPortal:
const { data: result, error } = await withTimeout(
  supabase.functions.invoke("customer-portal"),
  15000,
  "Portal request timed out. Please try again."
);
```

---

### 4. Add Payment Success Retry Logic

**File:** `src/hooks/useEntitlements.ts`

When returning from Stripe with `?payment=success`, retry the check up to 3 times with delays to handle Stripe webhook timing:

```typescript
// In the useEffect for payment URL params:
if (paymentStatus === "success") {
  toast.success("Welcome to Full Access! 🎉", {
    description: "The Controllables and Experience History are now unlocked.",
    duration: 5000,
  });
  
  // Retry check-payment with delays to handle Stripe webhook timing
  const retryCheck = async (attempts = 3) => {
    for (let i = 0; i < attempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      const result = await refetch();
      if (result.data?.isPaid) break;
    }
  };
  retryCheck();
  
  window.history.replaceState({}, "", window.location.pathname);
}
```

---

### 5. Add Error Recovery for check-payment

**File:** `src/hooks/useEntitlements.ts`

Add retry configuration to React Query for resilience:

```typescript
const { data, isLoading, refetch } = useQuery({
  queryKey: ["payment-status", userId],
  queryFn: async (): Promise<SubscriptionInfo> => {
    // ... existing logic
  },
  enabled: !!userId,
  staleTime: 1000 * 60 * 5,
  refetchOnWindowFocus: true,
  retry: 2, // Retry failed requests twice
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
});
```

---

### 6. Add Edge Function Test for Production Validation

**File:** `tests/e2e/stripe-production.spec.ts` (new)

Create a production-focused test that validates edge functions respond correctly:

```typescript
test.describe('Production Stripe Edge Functions', () => {
  test('check-payment responds without error', async ({ page }) => {
    // Test that function responds (not mocked)
    await page.goto('/dashboard');
    // ... validate no payment check errors in console
  });
  
  test('create-checkout accepts both plans', async ({ page }) => {
    // Validate monthly and yearly plan parameters work
  });
});
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/create-checkout/index.ts` | Expand CORS headers |
| `supabase/functions/check-payment/index.ts` | Expand CORS headers |
| `supabase/functions/customer-portal/index.ts` | Expand CORS headers |
| `supabase/config.toml` | Add customer-portal function config |
| `src/hooks/useEntitlements.ts` | Add timeouts, retry logic, error recovery |
| `tests/e2e/stripe-production.spec.ts` | New production validation tests |

---

## Testing Checklist

After implementation, verify:

1. **Monthly Checkout Flow**
   - Click upgrade with Monthly plan
   - Complete Stripe checkout with test card
   - Verify redirect to `/dashboard?payment=success`
   - Verify success toast appears
   - Verify isPaid = true immediately or within 3 seconds

2. **Yearly Checkout Flow**
   - Same as monthly but with Yearly plan
   - Verify correct price shown in Stripe ($79.99)

3. **Network Resilience**
   - Slow 3G network - verify timeout message appears
   - Airplane mode during checkout - verify error toast
   - Resume from background - verify payment status refreshes

4. **Paid User Experience**
   - AI Operators unlocked (no blur/overlay)
   - Experience History unlocked
   - Billing page shows correct plan/price
   - Customer Portal opens correctly

5. **Edge Cases**
   - Double-click checkout button (should not create multiple sessions)
   - Back button during checkout (should not break flow)
   - Already-paid user clicks upgrade (should show info message)

---

## Expected Outcomes

1. **Reliability**: Checkout never hangs - always resolves or times out with clear feedback
2. **Resilience**: Network issues don't break payment flow - retries handle transient failures
3. **Consistency**: CORS headers work on all browsers/devices
4. **Confidence**: Post-payment state is correctly detected within seconds
5. **Production-ready**: All edge functions properly configured and tested

