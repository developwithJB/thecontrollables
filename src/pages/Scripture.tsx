import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  gospelReadingUrl,
  GOSPEL_AWARENESS_PROMPTS,
} from "@/domain/formation/gospelAwareness";
import { gospelPassageId } from "../../supabase/functions/_shared/youversion";
import { YouVersionReader } from "@/components/formation/YouVersionReader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
function safeReference(value: string | null): string {
  try {
    gospelPassageId(value);
    return value!;
  } catch {
    return "Matthew 4:18-22";
  }
}
export default function Scripture() {
  const [params] = useSearchParams();
  const [reference, setReference] = useState(() =>
    safeReference(params.get("reference")),
  );
  const [input, setInput] = useState(reference);
  const [error, setError] = useState("");
  useEffect(() => {
    setInput(reference);
    setError("");
  }, [reference]);
  return (
    <main
      data-sentry-mask
      className="ph-no-capture mx-auto min-h-screen w-full max-w-3xl space-y-6 px-5 py-8"
    >
      <nav
        aria-label="Bible companion navigation"
        className="flex flex-wrap gap-5 text-sm"
      >
        <Link
          className="inline-flex min-h-11 items-center text-primary underline"
          to="/"
        >
          The Dashboard home
        </Link>
        <Link
          className="inline-flex min-h-11 items-center text-primary underline"
          to="/formation/today"
        >
          Back to Today
        </Link>
      </nav>
      <header className="space-y-3">
        <p className="text-sm font-semibold text-primary">
          Awareness 🦉 · Faith and spirituality
        </p>
        <h1 className="font-display text-3xl font-bold">
          Read the source. Notice Jesus.
        </h1>
        <p className="leading-7 text-muted-foreground">
          Begin with the Gospels. Read the passage in context, distinguish its
          words from interpretation, and carry one honest response into your
          day.
        </p>
      </header>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const next = input.trim();
            gospelPassageId(next);
            setReference(next);
            setError("");
          } catch {
            setError(
              "Use a Gospel passage such as John 13:1-17, within one chapter and up to 50 verses.",
            );
          }
        }}
      >
        <Label htmlFor="gospel-reference">Gospel passage</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="gospel-reference"
            value={input}
            maxLength={60}
            onChange={(event) => setInput(event.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "gospel-reference-error" : undefined}
          />
          <Button variant="futureOutline" type="submit">
            Choose passage
          </Button>
        </div>
        {error && (
          <p
            role="alert"
            id="gospel-reference-error"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </form>
      <section
        aria-label="Scripture source"
        className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-5"
      >
        <h2 className="font-display text-xl font-semibold">{reference}</h2>
        <a
          href={gospelReadingUrl(reference)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring"
        >
          Read {reference} in the NLT on Bible.com (new tab)
        </a>
        <p className="text-sm leading-6 text-muted-foreground">
          Bible.com is provided by YouVersion. The external link opens the New
          Living Translation; it does not copy Bible text into this app. This
          companion is independently developed by The Dashboard.
        </p>
      </section>
      <YouVersionReader key={reference} reference={reference} />
      <section aria-label="Three daily Awareness prompts" className="space-y-3">
        <h2 className="font-display text-xl font-semibold">
          Read, notice, respond
        </h2>
        <ol className="space-y-3 text-sm leading-7">
          {Object.entries(GOSPEL_AWARENESS_PROMPTS).map(([label, prompt]) => (
            <li key={label}>
              <strong className="capitalize">{label}:</strong> {prompt}
            </li>
          ))}
        </ol>
        <p className="text-xs leading-6 text-muted-foreground">
          These are formation prompts, not Scripture quotations or an approved
          75-day assignment. Prayer and reflection can stay private. Opening a
          reading does not record or complete a circuit.
        </p>
      </section>
      <p className="text-sm leading-7 text-muted-foreground">
        AI guidance can be mistaken. The coach does not verify every statement
        against Scripture. A wording match verifies only a quotation against the
        selected source, never its interpretation or theological review.
      </p>
    </main>
  );
}
