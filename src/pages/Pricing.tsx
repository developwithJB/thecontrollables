import { Link } from "react-router-dom";
import { FreemiumPlans } from "@/components/billing/FreemiumPlans";
import { Logo } from "@/components/Logo";
import { BookLink } from "@/components/BookLink";
export default function Pricing() {
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
          <Link
            to="/auth"
            className="inline-flex min-h-11 items-center underline"
          >
            Sign in
          </Link>
        </nav>
        <FreemiumPlans />
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
          The Dashboard is open source. You can adapt or self-host it under its
          repository license. Hosted Pro covers this app’s services and bounded
          AI usage; subscriptions to ChatGPT, Codex or other development tools
          do not pay your app’s inference bills.
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
