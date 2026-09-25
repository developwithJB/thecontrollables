import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
        <Link to="/" aria-label="Return to The Dashboard home"><Logo /></Link>
        <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 pb-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Terms</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">A voluntary practice, not a contract of perfection.</h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            This is a short notice for testers. Full terms will replace it before a public launch.
          </p>
          <p>
            Fully Charged is the primary 75-day path. Read Along is available at a flexible pace. 40-Day Charge is coming soon and cannot be started.
          </p>
          <p>
            An incomplete Fully Charged day ends that attempt. Earlier history stays. You can leave the morning email anytime in Settings.
          </p>
        </div>
      </main>
    </div>
  );
}
