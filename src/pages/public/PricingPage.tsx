import { Link, useNavigate } from "react-router-dom";
import { useOptionalAccount } from "@/hooks/useOptionalAccount";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { supabase } from "@/integrations/supabase/client";
import { clearSignedOutState } from "@/lib/signedOutState";
import { useQueryClient } from "@tanstack/react-query";
import { PageShimmer } from "@/components/layout/PageShimmer";
import { FreemiumPlans } from "@/components/billing/FreemiumPlans";
import { Logo } from "@/components/Logo";
import { BookLink } from "@/components/BookLink";
export default function PricingPage() {
  const { user, isLoading } = useOptionalAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return;
    clearSignedOutState(user?.id ?? "");
    void queryClient.cancelQueries();
    queryClient.clear();
    navigate("/");
  };
  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <nav
          aria-label="Pricing navigation"
          className="flex items-center justify-between gap-4"
        >
          <Link to="/" aria-label="The Dashboard home">
            <Logo />
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/formation/today"
                className="inline-flex min-h-11 items-center underline"
              >
                Today
              </Link>
              <Link
                to="/billing"
                className="inline-flex min-h-11 items-center underline"
              >
                Billing & plans
              </Link>
              <ProfileMenu
                onSettings={() => navigate("/settings")}
                onSignOut={() => void signOut()}
              />
            </div>
          ) : isLoading ? (
            <span role="status">Checking account…</span>
          ) : (
            <Link
              to="/auth"
              className="inline-flex min-h-11 items-center underline"
            >
              Sign in
            </Link>
          )}
        </nav>
        {isLoading ? <PageShimmer /> : <FreemiumPlans signedIn={!!user} />}
        <section className="rounded-2xl border border-border p-6 space-y-3">
          <h2 className="font-display text-xl font-semibold">
            Pair your practice with the book
          </h2>
          <p>
            The book is purchased separately. You can use Read Along without
            buying Pro.
          </p>
          <BookLink
            placement="pricing"
            className="inline-flex min-h-11 items-center text-primary underline"
          >
            Get The Controllables book
          </BookLink>
        </section>
        <p className="text-sm text-muted-foreground">
          The Dashboard’s original code is open source under the MIT License.
          You can adapt or self-host the code under its terms. Book text, Bible
          translations, and third-party material retain their separate rights.
          Hosted Pro covers this app’s services and bounded AI usage.
          Subscriptions to ChatGPT, Codex, or other development tools do not pay
          this app’s inference bills.
        </p>
        <p>
          <a
            href="https://github.com/developwithJB/thecontrollables"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center underline"
          >
            Source code & feedback
          </a>
        </p>
      </div>
    </main>
  );
}
