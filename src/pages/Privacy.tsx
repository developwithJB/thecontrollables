import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
        <Link to="/" aria-label="Return to The Dashboard home"><Logo /></Link>
        <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link>
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 pb-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Privacy</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Your practice stays yours.</h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            This is a short notice for testers. A full privacy policy will replace it before a public launch.
          </p>
          <p>
            The Dashboard stores your account and the formation path you choose so it can open today’s practice.
            Morning emails may include your first name, selected path, day number, and whether a circuit is open or recorded.
          </p>
          <p>
            Prayer, reflection, proof, and journal content are not included in the morning email. You can turn that email off in Settings.
          </p>
        </div>
      </main>
    </div>
  );
}
