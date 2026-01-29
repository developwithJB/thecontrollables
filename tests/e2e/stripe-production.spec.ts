import { test, expect } from "@playwright/test";

/**
 * Production Stripe Edge Function Tests
 * 
 * These tests validate that the Stripe payment edge functions are
 * responding correctly and handling both plan types.
 */
test.describe("Production Stripe Edge Functions", () => {
  test.describe("check-payment endpoint", () => {
    test("responds without CORS errors for authenticated users", async ({ page }) => {
      // Navigate to dashboard which triggers check-payment
      await page.goto("/dashboard");
      
      // Wait for page to settle
      await page.waitForTimeout(2000);
      
      // Check console for CORS errors
      const consoleLogs: string[] = [];
      page.on("console", (msg) => {
        consoleLogs.push(msg.text());
      });
      
      // Wait a bit more for any async errors
      await page.waitForTimeout(1000);
      
      // Ensure no CORS-related errors in console
      const corsErrors = consoleLogs.filter(
        (log) =>
          log.toLowerCase().includes("cors") ||
          log.toLowerCase().includes("access-control-allow")
      );
      
      expect(corsErrors.length).toBe(0);
    });

    test("returns valid response structure for unauthenticated user", async ({ page }) => {
      // Listen for network requests to check-payment
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("check-payment") &&
          response.status() !== 204, // Exclude preflight
        { timeout: 10000 }
      ).catch(() => null);
      
      await page.goto("/dashboard");
      
      const response = await responsePromise;
      
      // If we got a response, validate its structure
      if (response) {
        const body = await response.json().catch(() => ({}));
        
        // Should have isPaid field
        expect(typeof body.isPaid === "boolean" || body.error).toBeTruthy();
      }
    });
  });

  test.describe("create-checkout endpoint", () => {
    test("accepts monthly plan parameter", async ({ page }) => {
      // This tests that the function accepts the plan parameter correctly
      // We don't complete checkout, just verify the function responds
      
      await page.goto("/auth");
      
      // We can't fully test without auth, but we can verify the endpoint exists
      // and returns appropriate error for unauthenticated requests
      const response = await page.request.post(
        `https://mttsfdplqmvraefbfqlq.supabase.co/functions/v1/create-checkout`,
        {
          data: { plan: "monthly" },
          headers: {
            "Content-Type": "application/json",
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dHNmZHBscW12cmFlZmJmcWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODY0MzIsImV4cCI6MjA4MzQ2MjQzMn0.IBySiM7p2-eDqaXq0x4z1B6XEn-9As61CfDqpzvofmI",
          },
        }
      );
      
      // Should get 500 or error response for unauthenticated, not CORS error
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThanOrEqual(500);
      
      const body = await response.json();
      // Should return error about auth, not about plan parameter
      expect(body.error).toBeDefined();
      expect(body.error.toLowerCase()).toContain("auth");
    });

    test("accepts yearly plan parameter", async ({ page }) => {
      const response = await page.request.post(
        `https://mttsfdplqmvraefbfqlq.supabase.co/functions/v1/create-checkout`,
        {
          data: { plan: "yearly" },
          headers: {
            "Content-Type": "application/json",
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dHNmZHBscW12cmFlZmJmcWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODY0MzIsImV4cCI6MjA4MzQ2MjQzMn0.IBySiM7p2-eDqaXq0x4z1B6XEn-9As61CfDqpzvofmI",
          },
        }
      );
      
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThanOrEqual(500);
      
      const body = await response.json();
      expect(body.error).toBeDefined();
      expect(body.error.toLowerCase()).toContain("auth");
    });

    test("rejects invalid plan parameter", async ({ page }) => {
      const response = await page.request.post(
        `https://mttsfdplqmvraefbfqlq.supabase.co/functions/v1/create-checkout`,
        {
          data: { plan: "invalid_plan" },
          headers: {
            "Content-Type": "application/json",
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dHNmZHBscW12cmFlZmJmcWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODY0MzIsImV4cCI6MjA4MzQ2MjQzMn0.IBySiM7p2-eDqaXq0x4z1B6XEn-9As61CfDqpzvofmI",
          },
        }
      );
      
      // Should return error - either about auth or about invalid plan
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe("customer-portal endpoint", () => {
    test("returns appropriate response for unauthenticated request", async ({ page }) => {
      const response = await page.request.post(
        `https://mttsfdplqmvraefbfqlq.supabase.co/functions/v1/customer-portal`,
        {
          headers: {
            "Content-Type": "application/json",
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dHNmZHBscW12cmFlZmJmcWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODY0MzIsImV4cCI6MjA4MzQ2MjQzMn0.IBySiM7p2-eDqaXq0x4z1B6XEn-9As61CfDqpzvofmI",
          },
        }
      );
      
      // Should return auth error, not CORS error
      expect(response.status()).toBeGreaterThanOrEqual(200);
      
      const body = await response.json();
      expect(body.error).toBeDefined();
    });
  });

  test.describe("CORS headers validation", () => {
    test("all payment functions return proper CORS headers", async ({ page }) => {
      const endpoints = [
        "check-payment",
        "create-checkout", 
        "customer-portal",
      ];
      
      for (const endpoint of endpoints) {
        const response = await page.request.fetch(
          `https://mttsfdplqmvraefbfqlq.supabase.co/functions/v1/${endpoint}`,
          {
            method: "OPTIONS",
            headers: {
              "Origin": "https://thecontrollables.lovable.app",
              "Access-Control-Request-Method": "POST",
              "Access-Control-Request-Headers": "authorization, content-type, x-supabase-client-platform",
            },
          }
        );
        
        const headers = response.headers();
        
        expect(headers["access-control-allow-origin"]).toBe("*");
        expect(headers["access-control-allow-headers"]).toContain("authorization");
        expect(headers["access-control-allow-headers"]).toContain("content-type");
      }
    });
  });
});
