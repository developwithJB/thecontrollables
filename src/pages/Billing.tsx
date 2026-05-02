import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEntitlements, getPricing } from "@/hooks/useEntitlements";
import { SplashScreen } from "@/components/SplashScreen";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Crown,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import type { User } from "@supabase/supabase-js";
import { getFreeTrialOfferCopy } from "@/lib/entitlements";

export default function Billing() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const navigate = useNavigate();
  
  const { 
    isPaid, 
    isLoading, 
    planTier, 
    subscriptionStatus, 
    currentPeriodEnd,
    purchasedAt,
    openCustomerPortal,
    isOpeningPortal,
    initiateCheckout,
    isCheckingOut,
  } = useEntitlements(user?.id || null);

  const pricing = getPricing();
  const freeTrialOfferCopy = getFreeTrialOfferCopy();

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          setUser(session?.user ?? null);
          if (!session) {
            navigate("/auth");
          }
          setIsAuthLoading(false);
        }
      } catch (error) {
        console.error("Auth init error:", error);
        if (isMounted) {
          setIsAuthLoading(false);
          navigate("/auth");
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
        setIsAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (isAuthLoading || isLoading) {
    return <SplashScreen />;
  }

  const getPlanDisplay = () => {
    if (planTier === "lifetime") return "Lifetime Access";
    if (planTier === "premium") return "Premium";
    if (planTier === "pro") return "Pro";
    if (planTier === "plus") return "Plus";
    return "Free";
  };

  const getPlanPrice = () => {
    if (planTier === "lifetime") return "One-time purchase";
    if (planTier === "premium") return "Premium subscription";
    if (planTier === "pro") return `$${pricing.pro.annual}/year`;
    if (planTier === "plus") return `$${pricing.plus.annual}/year`;
    return "$0";
  };

  const getStatusBadge = () => {
    if (!isPaid) {
      return <Badge variant="secondary">Free Plan</Badge>;
    }
    
    if (subscriptionStatus === "active") {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
    }
    if (subscriptionStatus === "past_due") {
      return <Badge variant="destructive">Payment Due</Badge>;
    }
    if (subscriptionStatus === "canceled") {
      return <Badge variant="secondary">Ending Soon</Badge>;
    }
    return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-20" />
      {/* Header */}
      <header className="os-header">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          <Logo className="h-6" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Page Title */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Billing & Subscription</h1>
            <p className="text-muted-foreground mt-1">
              Manage your subscription and billing details
            </p>
          </div>

          {/* Current Plan Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isPaid ? (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">{getPlanDisplay()}</CardTitle>
                    <CardDescription>{getPlanPrice()}</CardDescription>
                  </div>
                </div>
                {getStatusBadge()}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {isPaid && currentPeriodEnd && planTier !== "lifetime" && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {subscriptionStatus === "canceled" ? "Access ends" : "Renews"} on{" "}
                    <span className="text-foreground font-medium">
                      {format(new Date(currentPeriodEnd), "MMMM d, yyyy")}
                    </span>
                  </span>
                </div>
              )}

              {purchasedAt && (
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Member since{" "}
                    <span className="text-foreground font-medium">
                      {format(new Date(purchasedAt), "MMMM d, yyyy")}
                    </span>
                  </span>
                </div>
              )}

              {subscriptionStatus === "past_due" && (
                <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">
                    Your payment is past due. Please update your payment method.
                  </span>
                </div>
              )}

              <Separator className="my-4" />

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {isPaid && planTier !== "lifetime" && (
                  <Button
                    onClick={openCustomerPortal}
                    disabled={isOpeningPortal}
                    className="w-full"
                  >
                    {isOpeningPortal ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Manage Subscription
                      </>
                    )}
                  </Button>
                )}

                {isPaid && planTier === "lifetime" && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-green-500" />
                    You have lifetime access. No subscription to manage.
                  </div>
                )}

                {!isPaid && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground text-center">
                      Unlock AI Companions and Experience History. {freeTrialOfferCopy} is included on Free.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={() => initiateCheckout("pro", { source: "billing_page_pro" })}
                        disabled={isCheckingOut}
                        className="flex-1"
                      >
                        {isCheckingOut ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          `Pro $${pricing.pro.annual}/yr`
                        )}
                      </Button>
                      <Button
                        onClick={() => initiateCheckout("plus", { source: "billing_page_plus" })}
                        disabled={isCheckingOut}
                        className="flex-1"
                      >
                        {isCheckingOut ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Plus $${pricing.plus.annual}/yr
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Features Included */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What's Included</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <FeatureRow 
                  label={freeTrialOfferCopy}
                  included={true} 
                  free={true}
                />
                <FeatureRow 
                  label="Life Perspective Scan"
                  included={true} 
                  free={true}
                />
                <FeatureRow 
                  label="Evolution & Charge System"
                  included={true} 
                  free={true}
                />
                <FeatureRow 
                  label="Time Reflection" 
                  included={true} 
                  free={true}
                />
                <FeatureRow 
                  label="Integrity Meter" 
                  included={true} 
                  free={true}
                />
                <Separator className="my-2" />
                <FeatureRow 
                  label="AI Companions" 
                  included={isPaid} 
                  premium={true}
                />
                <FeatureRow 
                  label="Experience History & Progress Tracking" 
                  included={isPaid} 
                  premium={true}
                />
                <FeatureRow 
                  label="Unlimited Chapter Quests"
                  included={isPaid} 
                  premium={true}
                />
                <FeatureRow 
                  label="Certificate Downloads" 
                  included={isPaid} 
                  premium={true}
                />
                <FeatureRow 
                  label="Daily Alignment" 
                  included={isPaid} 
                  premium={true}
                />
              </div>
            </CardContent>
          </Card>

          {/* Help */}
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground text-center">
                Need help? Message us on Instagram{" "}
                <a 
                  href="https://instagram.com/agbcoaching" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  @agbcoaching
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function FeatureRow({ 
  label, 
  included, 
  free, 
  premium 
}: { 
  label: string; 
  included: boolean; 
  free?: boolean;
  premium?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {premium && (
          <Badge variant="outline" className="text-xs font-normal">
            Premium
          </Badge>
        )}
      </div>
      {included ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
      )}
    </div>
  );
}
