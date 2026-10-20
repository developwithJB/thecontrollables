import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  gospelPassageId,
  type ScripturePassage,
} from "../../../supabase/functions/_shared/youversion";

export function YouVersionReader({ reference }: { reference: string }) {
  const [passage, setPassage] = useState<ScripturePassage | null>(null);
  const [quote, setQuote] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const requestState = useRef({ generation: 0 }).current;
  useEffect(() => {
    requestState.generation++;
    setPassage(null);
    setQuote("");
    setNotice("");
    setBusy(false);
    return () => {
      requestState.generation++;
    };
  }, [reference, requestState]);
  // Presentation only. The server independently requires verified auth, an
  // operator rollout, written commercial approval and a licensed app/version.
  if (import.meta.env.VITE_YOUVERSION_READER_ENABLED !== "true") return null;
  async function load(operation: "passage" | "verify_quote") {
    const current = requestState.generation;
    setBusy(true);
    setNotice("");
    try {
      const { data: session } = await supabase.auth.getSession();
      if (requestState.generation !== current) return;
      if (!session.session) {
        setNotice(
          "Sign in to use the in-app reader. Bible.com is available without a Dashboard account.",
        );
        return;
      }
      const { data, error } = await supabase.functions.invoke(
        "scripture-passage",
        {
          body: {
            operation,
            reference,
            ...(operation === "verify_quote" ? { quote } : {}),
          },
        },
      );
      if (requestState.generation !== current) return;
      if (
        error ||
        !data?.passage ||
        data.passage.id !== gospelPassageId(reference) ||
        typeof data.passage.reference !== "string" ||
        !/^[1-9]\d{0,8}$/.test(data.passage.bibleId) ||
        data.passage.sourceUrl !==
          `https://www.bible.com/bible/${data.passage.bibleId}/${data.passage.id}` ||
        typeof data.passage.text !== "string" ||
        typeof data.passage.version !== "string" ||
        !data.passage.version.trim() ||
        typeof data.passage.copyright !== "string" ||
        !data.passage.copyright.trim()
      )
        throw Error("unavailable");
      setPassage(data.passage);
      if (operation === "verify_quote")
        setNotice(
          data.verdict === "exact"
            ? "Exact wording match for this full passage and translation (whitespace ignored). This does not verify interpretation."
            : "Not an exact match. Read the source wording below; do not present the supplied text as a verified quotation.",
        );
    } catch {
      if (requestState.generation === current) {
        setPassage(null);
        setNotice(
          "The in-app reader is unavailable. Use the Bible.com reading link above.",
        );
      }
    } finally {
      if (requestState.generation === current) setBusy(false);
    }
  }
  return (
    <section
      aria-label="YouVersion passage reader"
      className="ph-no-capture space-y-3 rounded-2xl border border-border p-4"
      data-sentry-mask
    >
      <Button
        variant="futureOutline"
        disabled={busy}
        onClick={() => void load("passage")}
      >
        {busy ? "Checking source…" : "Read passage here"}
      </Button>
      {notice && (
        <p role="status" className="text-sm leading-6">
          {notice}
        </p>
      )}
      {passage && (
        <>
          <h2 className="font-semibold">
            {passage.reference} · {passage.version}
          </h2>
          <blockquote className="whitespace-pre-wrap text-base leading-8">
            {passage.text}
          </blockquote>
          <p className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
            {passage.copyright}
          </p>
          <p className="text-xs text-muted-foreground">
            Source: YouVersion Platform · {passage.version}. Text is displayed
            as returned, separately from AI guidance.
          </p>
          <a
            className="inline-flex min-h-11 items-center rounded text-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring"
            href={passage.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open this translation on Bible.com (new tab)
          </a>
          <details>
            <summary className="cursor-pointer py-3 font-semibold">
              Check a quotation
            </summary>
            <div className="space-y-3">
              <Label htmlFor="scripture-quote">
                Full verse or range to compare
              </Label>
              <Textarea
                id="scripture-quote"
                value={quote}
                maxLength={4000}
                onChange={(event) => {
                  requestState.generation++;
                  setQuote(event.target.value);
                  setNotice("");
                  setBusy(false);
                }}
                aria-describedby="scripture-quote-privacy"
              />
              <p
                id="scripture-quote-privacy"
                className="text-xs leading-5 text-muted-foreground"
              >
                Compare the entire selected passage in the displayed
                translation. Only the passage reference goes to YouVersion. Your
                pasted quote is checked on our server, never sent to AI or saved
                by this feature.
              </p>
              <Button
                variant="futureOutline"
                disabled={busy || !quote.trim()}
                onClick={() => void load("verify_quote")}
              >
                Compare with source
              </Button>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
