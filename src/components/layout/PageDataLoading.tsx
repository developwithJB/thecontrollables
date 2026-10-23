import { useIsFetching } from "@tanstack/react-query";
import { PageShimmer } from "./PageShimmer";
/** Observe existing queries; never add a fetch or hide already usable content. */
export function PageDataLoading({ userId }: { userId: string }) {
  const pending = useIsFetching({
    predicate: (q) =>
      q.queryKey.includes(userId) && q.state.status === "pending",
  });
  return pending > 0 ? <PageShimmer /> : null;
}
