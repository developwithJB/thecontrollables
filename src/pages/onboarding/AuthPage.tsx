import type { User as AuthUser } from "@supabase/supabase-js";
import { NEW_PASSWORD_MIN_LENGTH } from "@/lib/launchFunnel";
import { useRef } from "react";
import { FormationAvailability } from "@/components/onboarding/FormationAvailability";
import { useFormationEntryStatus } from "@/hooks/useFormationEntryStatus";
import { getSignupAttribution } from "@/lib/growthAttribution";
import { trackGrowthEvent, signupFailureCategory, trackAuthenticatedVisit } from "@/lib/growthEvents";
import { useCallback, useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { BellRing, Clock3, Eye, EyeOff, Mail, Lock, ArrowLeft, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePageViewTracking, useAnalytics } from "@/hooks/useAnalytics";
import { useOnboardingAnalytics } from "@/hooks/useOnboardingAnalytics";
import { clearOnboardingQuickStartDraft, getOnboardingQuickStartDraft, getQuickStartCompletionRoute } from "@/lib/onboardingQuickStartDraft";
import { READING_STATUS_LABELS } from "@/lib/readAlong";
import { TRACK_LABELS, type TrainingTrack } from "@/domain/formation/circuits";
import { saveFormationTrackSelection } from "@/hooks/useFormationTrack";
import { toSafeInternalPath } from "@/lib/safeNavigation";
import {
  activateFormationEnrollment,
} from "@/lib/formationEnrollment";
import {
  buildFormationSignupMetadata,
  formatFormationEmailSchedule,
  getDeviceTimezone,
  isStartableFormationTrack,
} from "@/lib/formationEnrollmentConfig";

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

export default function AuthPage() {
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
  useEffect(() => { if (mode === "signup") trackGrowthEvent("signup_form_viewed"); }, [mode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const quickStartDraft = useMemo(() => getOnboardingQuickStartDraft(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [signInError, setSignInError] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);
  const [enrollmentError, setEnrollmentError] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const preparing = useRef(false);
  const preparedUser = useRef<string | null>(null);
  const reducedMotion = useReducedMotion();
  const availability = useFormationEntryStatus();
  useEffect(() => {
    const tick = () => setCountdown(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const draftTrack = isStartableFormationTrack(quickStartDraft?.formationTrack) ? quickStartDraft.formationTrack : null;
  const selectedFormationTrack: TrainingTrack | null = draftTrack ?? (mode === "signup" ? "read_along" : null);
  const selectedEnrollment = useMemo(() => draftTrack
    ? {
        track: draftTrack,
        dailyEmailEnabled: quickStartDraft?.dailyEmailEnabled ?? false,
        timezone: quickStartDraft?.timezone || getDeviceTimezone(),
      }
    : null, [draftTrack, quickStartDraft]);
  const postAuthRoute = useMemo(() => {
    const fallback = getQuickStartCompletionRoute(
      quickStartDraft?.readingStatus,
      selectedFormationTrack,
    );
    const requestedReturnTo = searchParams.get("returnTo");
    return requestedReturnTo ? toSafeInternalPath(requestedReturnTo, fallback) : fallback;
  }, [quickStartDraft, searchParams, selectedFormationTrack]);

  const preparePostAuthDestination = useCallback(async (user: AuthUser) => {
    if (preparing.current || preparedUser.current === user.id) return;
    preparing.current = true;
    setIsPreparing(true);
    setEnrollmentError(false);
    try {
      const metadata = user.user_metadata;
      if (user.email_confirmed_at) trackAuthenticatedVisit(user.id);
      const enrollment = selectedEnrollment;
      if (enrollment) {
        await activateFormationEnrollment(enrollment);
        saveFormationTrackSelection(user.id, enrollment.track);
        clearOnboardingQuickStartDraft();
      } else if (selectedFormationTrack) saveFormationTrackSelection(user.id, selectedFormationTrack);
      preparedUser.current = user.id;
      navigate((enrollment || isStartableFormationTrack(metadata?.formation_track)) && !searchParams.get("returnTo") ? "/formation/today" : postAuthRoute, { replace: true });
    } catch {
      setEnrollmentError(true);
    } finally {
      preparing.current = false;
      setIsPreparing(false);
    }
  }, [navigate, postAuthRoute, searchParams, selectedEnrollment, selectedFormationTrack]);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Keep asynchronous Supabase work outside the auth callback lock.
      if (event === "PASSWORD_RECOVERY") setMode("reset");
      else if (session?.user && event === "SIGNED_IN") setSessionUser(session.user);
    });
    const hash = new URLSearchParams(window.location.hash.substring(1));
    if (hash.get("type") === "recovery") setMode("reset");
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session?.user && hash.get("type") !== "recovery") setSessionUser(data.session.user);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (sessionUser && mode !== "reset") void preparePostAuthDestination(sessionUser);
  }, [sessionUser, mode, preparePostAuthDestination]);

  const resendConfirmation = async () => {
    if (isLoading || Date.now() < resendAt) return;
    setIsLoading(true);
    setConfirmationMessage("");
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${window.location.origin}/auth?returnTo=%2Fformation%2Ftoday` } });
      if (error) throw error;
      setResendAt(Date.now() + 60_000);
      setConfirmationMessage("Confirmation requested. Check your inbox and spam folder.");
    } catch {
      setConfirmationMessage("We could not resend right now. Wait a moment and try again.");
      setResendAt(Date.now() + 60_000);
    } finally { setIsLoading(false); }
  };

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
    if (!newPassword || newPassword.length < NEW_PASSWORD_MIN_LENGTH) {
      toast({ title: "Invalid password", description: "Password must be at least 8 characters.", variant: "destructive" });
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
    setSignInError(false);
    if (!email || !password || (mode === "signup" && !displayName.trim())) {
      toast({
        title: "Missing fields",
        description: mode === "signup" && !displayName.trim() ? "Please enter your name so we can greet you." : "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    if (mode === "signup" && password.length < NEW_PASSWORD_MIN_LENGTH) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (mode === "signup" && selectedEnrollment?.track === "fully_charged_75" && !availability.data?.strictReady) {
      toast({ title: "Choose an available path", description: "Fully Charged is waiting for reviewed content. Choose Read Along to begin today." });
      return;
    }
    setIsLoading(true);
    try {
      if (mode === "signup") {
        const signupMetadata = buildFormationSignupMetadata(selectedEnrollment ?? { track: "read_along", dailyEmailEnabled: false, timezone: getDeviceTimezone() });
        const { data: signUpData, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?returnTo=${encodeURIComponent(postAuthRoute)}`,
            data: { display_name: displayName.trim() || null, ...getSignupAttribution(), ...signupMetadata },
          },
        });
        if (error) {
          if (error.message.includes("already registered")) {
            trackGrowthEvent("signup_failed", { reason_category: "exists" });
            setMode("signin"); setPassword(""); setSignInError(true);
            toast({ title: "Account exists", description: "This email is already registered. Try signing in instead.", variant: "destructive" });
          } else throw error;
        } else {
          trackGrowthEvent("signup_submitted");
          if (signUpData?.session) {
            trackAccountCreated("signup_form");
            setSessionUser(signUpData.session.user);
          } else {
            setConfirmationPending(true);
            setResendAt(Date.now() + 60_000);
            setPassword("");
          }
        }
      } else {
        const { data: signedIn, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setSignInError(true);
            toast({ title: "Invalid credentials", description: "Please check your email and password.", variant: "destructive" });
          } else throw error;
        } else if (signedIn.session) setSessionUser(signedIn.session.user);
      }
    } catch (error) {
      if (mode === "signup") trackGrowthEvent("signup_failed", { reason_category: signupFailureCategory(error) });
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
          return `Your ${TRACK_LABELS[quickStartDraft.formationTrack]} path is selected. Create your account to open today’s practice after setup. If email confirmation is required, we’ll show you the next step.`;
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
        return "Choose Fully Charged for a strict commitment or Read Along for a flexible pace.";
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
              animate={reducedMotion ? undefined : { y: [0, -5, 0] }}
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
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
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

            {sessionUser && mode !== "reset" ? (
              <section aria-live="polite" className="space-y-4" data-testid="enrollment-state">
                <h2 className="text-lg font-semibold">{enrollmentError ? "Your account is ready. Path setup needs another try." : "Saving your path preferences…"}</h2>
                <p className="text-sm text-muted-foreground">{enrollmentError ? "Your selection is still here. We have not confirmed your email reminder or path enrollment." : "We will open Today after enrollment is confirmed."}</p>
                {enrollmentError ? <Button variant="future" disabled={isPreparing} onClick={() => void preparePostAuthDestination(sessionUser)}>Retry path setup</Button> : null}
              </section>
            ) : confirmationPending ? (
              <section className="space-y-4" aria-labelledby="confirmation-heading" data-testid="signup-confirmation">
                <h2 id="confirmation-heading" className="text-xl font-semibold">Check your email to continue</h2>
                <p className="text-sm text-muted-foreground">If confirmation is needed, a link is on its way to <strong>{email.replace(/^(.).+(@.*)$/, "$1•••$2")}</strong>. Check spam too. Your chosen path will open after confirmation and setup.</p>
                <p className="text-sm">Email reminders are a preference until enrollment succeeds. You can always return to Today in the app.</p>
                <Button variant="futureOutline" disabled={isLoading || countdown > 0} onClick={() => void resendConfirmation()}>{countdown > 0 ? `Resend in ${countdown}s` : "Resend confirmation"}</Button>
                <Button variant="ghost" onClick={() => { setConfirmationPending(false); setConfirmationMessage(""); }}>Edit email address</Button>
                <Button variant="ghost" onClick={() => { setConfirmationPending(false); setMode("signin"); }}>Back to sign in</Button>
                <p role="status" className="text-sm">{confirmationMessage}</p>
              </section>
            ) : mode === "reset" ? (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      required minLength={NEW_PASSWORD_MIN_LENGTH} aria-describedby="reset-password-help"
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
                <p id="reset-password-help" className="text-xs text-muted-foreground">Use at least 8 characters. A longer, unique password is best.</p>
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
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10 bg-background/50" autoComplete="email" />
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
                {signInError && mode === "signin" ? <p role="alert" className="mb-4 text-sm">We could not sign you in. Check your details or <button type="button" className="underline text-primary" onClick={() => {setMode("forgot");setSignInError(false);}}>Forgot password?</button></p> : null}
                {mode === "signup" ? (
                  <div className="mb-5 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] leading-4 text-muted-foreground">
                      {["Private by default", "Morning loop", "Change paths anytime"].map((benefit) => (
                        <div key={benefit} className="rounded-lg border border-border/60 bg-background/40 px-2 py-2">
                          {benefit}
                        </div>
                      ))}
                    </div>
                    {selectedEnrollment ? (
                      <div className={`rounded-xl border p-3 ${selectedEnrollment.dailyEmailEnabled ? "border-cyan-400/30 bg-cyan-400/[0.07]" : "border-border/60 bg-background/35"}`}>
                        <div className="flex items-start gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selectedEnrollment.dailyEmailEnabled ? "bg-cyan-400/10 text-cyan-300" : "bg-muted text-muted-foreground"}`}>
                            <BellRing className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                              {selectedEnrollment.dailyEmailEnabled ? "Morning email requested · not active yet." : "Morning email not requested."}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs leading-5 text-muted-foreground">
                              <Clock3 className="h-3.5 w-3.5 shrink-0" />
                              {selectedEnrollment.dailyEmailEnabled
                                ? `Requested for ${formatFormationEmailSchedule(selectedEnrollment.timezone)} after account confirmation and successful setup. Delivery availability is checked separately.`
                                : "Today works without email. You can request reminders later in Settings."}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {!quickStartDraft?.formationTrack ? (
                      <p className="text-center text-xs text-muted-foreground">
                        Want the hard track or a flexible pace?{" "}
                        <Link to="/quick-start" className="font-semibold text-primary hover:underline">Compare Fully Charged and Read Along</Link>
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {mode === "signup" && selectedEnrollment?.track === "fully_charged_75" ? <FormationAvailability /> : null}
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
                      <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10 bg-background/50" autoComplete="email" data-testid="auth-email-input" />
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
                      <Input id="password" required minLength={mode === "signup" ? NEW_PASSWORD_MIN_LENGTH : undefined} aria-describedby={mode === "signup" ? "password-help" : undefined} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 pr-10 bg-background/50" autoComplete={mode === "signin" ? "current-password" : "new-password"} data-testid="auth-password-input" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {mode === "signup" ? <p id="password-help" className="text-xs text-muted-foreground">Use at least 8 characters. A longer, unique password is best.</p> : null}
                  <Button type="submit" variant="glow" className="w-full" disabled={isLoading || (mode === "signup" && selectedEnrollment?.track === "fully_charged_75" && !availability.data?.strictReady)} data-testid="auth-submit-button">
                    {isLoading ? (mode === "signin" ? "Signing in..." : "Creating account...") : (mode === "signin" ? "Sign In" : "Create account & start my daily loop")}
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

            <p className="mt-8 text-xs text-center text-muted-foreground">
              Formation reflections stay private to your account and are excluded from formation analytics.
              {" "}
              <Link to="/privacy" className="underline hover:text-foreground">Privacy</Link>
              {" · "}
              <Link to="/terms" className="underline hover:text-foreground">Terms</Link>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
