import { forwardRef, type ReactNode } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { BOOK_URL, type BookPlacement } from "@/lib/bookLinks";

type BookLinkProps = {
  placement: BookPlacement;
  className?: string;
  children: ReactNode;
  "data-testid"?: string;
};

export const BookLink = forwardRef<HTMLAnchorElement, BookLinkProps>(function BookLink(
  { placement, className, children, "data-testid": testId }, ref,
) {
  const { trackEvent } = useAnalytics();
  return (
    <a ref={ref} href={BOOK_URL} target="_blank" rel="noopener noreferrer"
      className={className} data-testid={testId}
      onClick={() => {
        try { void Promise.resolve(trackEvent("cta", "book_link_click", { placement })).catch(() => undefined); }
        catch { /* Analytics must never interrupt navigation. */ }
      }}
    >
      {children}
    </a>
  );
});
