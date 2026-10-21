"use client";

import { useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { useViewer } from "../../providers/viewer";

// Lean selection: the badge only needs to count rows the viewer can approve. There is no
// count-only endpoint in coact-api yet. Refetch by name ("ShellNavBadges") after approve/reject.
const NAV_BADGES = gql`
  query ShellNavBadges {
    requests(fetchprocessed: false, showmine: false) { Id canapprove }
  }
`;

/**
 * Nav badge counts: { requests: <pending requests the viewer can approve> }.
 * Loading, error and zero all return {} so the nav never waits on (or shows) this query.
 */
export function useNavBadges() {
  const { viewer } = useViewer();
  const { data } = useQuery(NAV_BADGES, {
    skip: !viewer,
    pollInterval: 120_000,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: false,
    // Ethos "motion budget": nothing loops while the tab is hidden.
    skipPollAttempt: () => typeof document !== "undefined" && document.hidden,
  });
  return useMemo(() => {
    const n = viewer ? (data?.requests ?? []).filter((r) => r?.canapprove).length : 0;
    return n > 0 ? { requests: n } : {};
  }, [data, viewer]);
}
