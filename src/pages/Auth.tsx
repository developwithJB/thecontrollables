import { useCallback, useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, ArrowLeft, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePageViewTracking, useAnalytics } from "@/hooks/useAnalytics";
import { useOnboardingAnalytics } from "@/hooks/useOnboardingAnalytics";
import { getOnboardingQuickStartDraft, getQuickStartCompletionRoute } from "@/lib/onboardingQuickStartDraft";
import { READING_STATUS_LABELS } from "@/lib/readAlong";
import { TRACK_LABELS, type TrainingTrack } from "@/domain/formation/circuits";
import { saveFormationTrackSelection } from "@/hooks/useFormationTrack";
import { toSafeInternalPath } from "@/lib/safeNavigation";

type AuthMode = "signin" | "signup" | "forgot" | "reset";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

export default function Auth() {
  usePageViewTracking("Auth");
  const { trackEvent } = useAnalytics();
  const { trackAccountCreated } = useOnboardingAnalytics();
  
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "signup") return "signup";
    if (urlMode === "forgot") return "forgot";
    return "signin";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const quickStartDraft = useMemo(() => getOnboardingQuickStartDraft(), []);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const selectedFormationTrack: TrainingTrack | null = quickStartDraft?.formationTrack ?? (mode === "signup" ? "read_along" : null);
  const postAuthRoute = useMemo(() => {
    const fallback = getQuickStartCompletionRoute(
      quickStartDraft?.readingStatus,
      selectedFormationTrack,
    );
    const requestedReturnTo = searchParams.get("returnTo");
    return requestedReturnTo ? toSafeInternalPath(requestedReturnTo, fallback) : fallback;
  }, [quickStartDraft, searchParams, selectedFormationTrack]);

  const preparePostAuthDestination = useCallback((userId?: string) => {
    if (userId && selectedFormationTrack) {
      saveFormationTrackSelection(userId, selectedFormationTrack);
    }
    return postAuthRoute;
  }, [postAuthRoute, selectedFormationTrack]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event);
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
      } else if (event === "SIGNED_IN" && mode !== "reset") {
        navigate(preparePostAuthDestination(session?.user.id));
      }
    });

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    const accessToken = hashParams.get("access_token");
    
    if (type === "recovery" && accessToken) {
      setMode("reset");
    } else {
      const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mode !== "reset") {
          navigate(preparePostAuthDestination(session.user.id));
        }
      };
      checkSession();
    }

    return () => subscription.unsubscribe();
  }, [navigate, mode, preparePostAuthDestination]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` });
      if (error) throw error;
      toast({ title: "Check your email", description: "We've sent you a password reset link." });
      setMode("signin");
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error, "Failed to send reset email."), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Invalid password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated", description: "Your password has been reset. Redirecting..." });
      setTimeout(() => navigate(postAuthRoute), 1500);
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error, "Failed to update password."), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (mode === "signup" && !displayName.trim())) {
      toast({
        title: "Missing fields",
        description: mode === "signup" && !displayName.trim() ? "Please enter your name so we can greet you." : "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      if (mode === "signup") {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}${postAuthRoute}`,
            data: { display_name: displayName.trim() || null },
          },
        });
        if (error) {
          if (error.message.includes("already registered")) {
            toast({ title: "Account exists", description: "This email is already registered. Try signing in instead.", variant: "destructive" });
          } else throw error;
        } else {
          trackAccountCreated("signup_form");
          if (signUpData?.session) {
            toast({ title: "Welcome", description: "Your account is ready. Opening your dashboard…" });
          } else {
            toast({ title: "Check your email", description: "We've sent you a confirmation link. Please check your email to activate your account." });
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({ title: "Invalid credentials", description: "Please check your email and password.", variant: "destructive" });
          } else throw error;
        }
      }
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error, "Something went wrong. Please try again."), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "forgot": return "Reset your password";
      case "reset": return "Set new password";
      case "signup": return "Create your account";
      default: return "Welcome back";
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case "forgot": return "Enter your email and we'll send you a reset link";
      case "reset": return "Enter your new password below";
      case "signup":
        if (quickStartDraft?.formationTrack) {
          return `Your ${TRACK_LABELS[quickStartDraft.formationTrack]} path is ready. Create an account to open today’s practice.`;
        }
        if (quickStartDraft?.readingStatus) {
          return `Finish setup to keep your book path: ${READING_STATUS_LABELS[quickStartDraft.readingStatus]}`;
        }
        if (quickStartDraft?.snapshotName) {
          return `Finish setup to keep your starting region: ${quickStartDraft.snapshotName}`;
        }
        if (quickStartDraft?.lifeSeasonLabel) {
          return `Finish setup to keep your ${quickStartDraft.lifeSeasonLabel.toLowerCase()} reflection`;
        }
        return "Start with Read Along, our flexible path. Compare all three paths first if you prefer.";
      default: return searchParams.get("returnTo") ? "Sign in to continue where you left off." : "Sign in to access your dashboard";
    }
  };

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Grid background */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-30" />

      {/* Left Panel - Branding (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between relative overflow-hidden">
        {/* Animated mesh background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary to-background animate-mesh-drift" style={{ backgroundSize: '400% 400%' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,hsl(var(--accent)/0.1),transparent_60%)]" />
        
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full border-2 border-accent/60 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-accent animate-glow-pulse" />
              </div>
            </div>
            <div>
              <span className="font-display font-bold text-xl text-foreground">
                The Dashboard
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <blockquote className="text-2xl font-display font-medium text-foreground/80 mb-4">
            "People don't need more. They need clarity."
          </blockquote>
          <p className="text-muted-foreground">
            — The Controllables
          </p>
        </div>

        <div className="relative z-10 flex gap-3">
          {["🦉", "🐢", "🦈", "🛰️", "🚀"].map((emoji, i) => (
            <motion.span
              key={emoji}
              className="text-2xl opacity-60"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
            >
              {emoji}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Right Panel - Form */}
      <main className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Glass card wrapper */}
          <div className="glass-card p-8 rounded-2xl">
            <div className="lg:hidden mb-8">
              <Link to="/">
                <Logo />
              </Link>
            </div>

            <div className="mb-8">
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                {getTitle()}
              </h1>
              <p className="text-muted-foreground">
                {getSubtitle()}
              </p>
            </div>

            {mode === "reset" ? (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-background/50"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            ) : mode === "forgot" ? (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10 bg-background/50" autoComplete="email" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
                <div className="text-center">
                  <button type="button" onClick={() => setMode("signin")} className="text-sm text-accent hover:underline font-medium">
                    Back to sign in
                  </button>
                </div>
              </form>
            ) : (
              <>
                {mode === "signup" ? (
                  <div className="mb-5 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] leading-4 text-muted-foreground">
                      {["Private by default", "No public rankings", "Change paths anytime"].map((benefit) => (
                        <div key={benefit} className="rounded-lg border border-border/60 bg-background/40 px-2 py-2">
                          {benefit}
                        </div>
                      ))}
                    </div>
                    {!quickStartDraft?.formationTrack ? (
                      <p className="text-center text-xs text-muted-foreground">
                        Want structure or strict accountability?{" "}
                        <Link to="/quick-start" className="font-semibold text-primary hover:underline">Compare all three paths</Link>
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <form onSubmit={handleSubmit} className="space-y-5" data-testid="auth-form">
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Your Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How should we greet you?" className="pl-10 bg-background/50" autoComplete="name" required data-testid="auth-name-input" />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10 bg-background/50" autoComplete="email" data-testid="auth-email-input" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <button type="button" onClick={() => setMode("forgot")} className="text-xs text-accent hover:underline">Forgot password?</button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 pr-10 bg-background/50" autoComplete={mode === "signin" ? "current-password" : "new-password"} data-testid="auth-password-input" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" variant="glow" className="w-full" disabled={isLoading} data-testid="auth-submit-button">
                    {isLoading ? (mode === "signin" ? "Signing in..." : "Creating account...") : (mode === "signin" ? "Sign In" : "Create account & open my first day")}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                    <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-accent hover:underline font-medium" data-testid="auth-toggle-mode">
                      {mode === "signin" ? "Sign up" : "Sign in"}
                    </button>
                  </p>
                </div>
              </>
            )}

            <p className="mt-8 text-xs text-center text-muted-foreground/60">
              Formation reflections stay private to your account and are excluded from formation analytics.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
