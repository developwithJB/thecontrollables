import { forwardRef, type ReactNode } from "react";
import { trackGrowthEvent } from "@/lib/growthEvents";
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
  return (
    <a ref={ref} href={BOOK_URL} target="_blank" rel="noopener noreferrer"
      className={className} data-testid={testId} data-book-placement={placement}
      onClick={() => {
        try { void Promise.resolve(trackGrowthEvent("book_link_click", { placement })).catch(() => undefined); }
        catch { /* Analytics must never interrupt navigation. */ }
      }}
    >
      {children}
    </a>
  );
});
