import { useIsFetching } from "@tanstack/react-query";
import { PageShimmer } from "./PageShimmer";
/** Observe only this page's existing queries; never add a fetch or wait on other pages. */
export function PageDataLoading({ userId, queryNames, loading = false }: {
  userId: string;
  queryNames: readonly string[];
  loading?: boolean;
}) {
  const pending = useIsFetching({
    predicate: q => queryNames.includes(String(q.queryKey[0])) &&
      q.queryKey.includes(userId) && q.state.status === "pending",
  });
  return loading || pending > 0 ? <PageShimmer /> : null;
}
