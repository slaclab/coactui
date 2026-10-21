"use client";

import { useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { useClusters, useRollupAnchor } from "../../data/clusters";
import { addDays, isoDay, rangeOf } from "../../lib/dates";

const CLUSTER_USAGE = gql`
  query RedesignClusterUsage($cluster: String!, $daily: ReportRangeInput!, $monthly: ReportRangeInput!) {
    daily: reportFacilityComputeByDay(clustername: $cluster, range: $daily, group: "Day") { facility repo date resourceHours }
    monthly: reportFacilityComputeByDay(clustername: $cluster, range: $monthly, group: "Month") { facility repo date resourceHours }
    facilities { name computepurchases { clustername purchased } }
  }
`;

export function useClusterUsage(clustername) {
  const { clusters, loading: clustersLoading, error: clustersError } = useClusters();
  const { anchor, loading: anchorLoading, error: anchorError } = useRollupAnchor(clustername);
  // Every cluster page needs the cluster's rollup and its purchasers; one request for both.
  const monthStart = anchor ? `${anchor.slice(0, 7)}-01` : null;
  const { data, loading, error, refetch } = useQuery(CLUSTER_USAGE, {
    skip: !anchor,
    variables: anchor
      ? {
          cluster: clustername,
          daily: rangeOf(addDays(anchor, -34), anchor),
          // 13 months back so "Year" can show the last 12 complete months before the anchor month.
          monthly: rangeOf(isoDay(Date.UTC(+monthStart.slice(0, 4), +monthStart.slice(5, 7) - 14, 1)), anchor),
        }
      : undefined,
  });

  return useMemo(() => {
    const cluster = clusters.find((c) => c.name === clustername);
    const base = {
      anchor,
      cluster,
      loading: clustersLoading || anchorLoading || loading || (!!anchor && !data),
      error: clustersError ?? anchorError ?? error,
      empty: !anchorLoading && !anchorError && !anchor,
      // The cluster list has loaded and this name isn't in it.
      notFound: !clustersLoading && !clustersError && clusters.length > 0 && !cluster,
      refetch,
    };
    if (!data || !cluster) return base;
    const purchases = (data.facilities ?? [])
      .map((f) => ({ facility: f.name, nodes: (f.computepurchases ?? []).find((p) => p.clustername === clustername)?.purchased ?? 0 }))
      .filter((p) => p.nodes > 0);
    return {
      ...base,
      purchases,
      daily: data.daily.map((u) => ({ facility: u.facility, repo: u.repo, date: u.date.slice(0, 10), rh: u.resourceHours })),
      // dateTrunc runs in America/Los_Angeles, so the month boundary is 07:00/08:00Z; take the month part.
      monthly: data.monthly.map((u) => ({ facility: u.facility, repo: u.repo, month: u.date.slice(0, 7), rh: u.resourceHours })),
    };
  }, [clusters, clustername, anchor, data, clustersLoading, anchorLoading, loading, clustersError, anchorError, error, refetch]);
}

const USER_USAGE = gql`
  query UsageClusterByUser($cluster: String!, $range: ReportRangeInput!) {
    reportFacilityComputeByUser(clustername: $cluster, range: $range) { facility repo username resourceHours }
  }
`;

const USER_USAGE_LIVE = gql`
  query UsageClusterByUserLive($cluster: String!, $range: ReportRangeInput!) {
    reportFacilityComputeByUserToDate(clustername: $cluster, range: $range) { facility repo username resourceHours }
  }
`;

/**
 * Per-user usage for the By user tab. source "rollup" = the anchored chart window;
 * "live" = raw jobs from the day after the last rollup until now. Skipped until the anchor is
 * known and while the tab isn't showing. Returns { rows, days, loading, error, refetch }.
 */
export function useClusterUserUsage({ clustername, anchor, reportRange, dayCount, source, skip }) {
  const live = source === "live";
  const today = isoDay(Date.now());
  const liveStart = anchor ? addDays(anchor, 1) : null;
  const variables = live
    ? { cluster: clustername, range: rangeOf(liveStart ?? today, today) }
    : { cluster: clustername, range: reportRange };
  const off = skip || !anchor || (!live && !reportRange) || (live && liveStart > today);
  const rollup = useQuery(USER_USAGE, { skip: off || live, variables });
  const jobs = useQuery(USER_USAGE_LIVE, { skip: off || !live, variables });
  const q = live ? jobs : rollup;
  const rows = live ? q.data?.reportFacilityComputeByUserToDate : q.data?.reportFacilityComputeByUser;
  return {
    rows: rows ?? [],
    // Capacity window for "share of cluster": the rollup window, or the days since the rollup.
    days: live ? Math.max(1, Math.round((Date.parse(today) - Date.parse(liveStart ?? today)) / 86400000) + 1) : dayCount,
    loading: !off && (q.loading || (!q.data && !q.error)),
    error: q.error,
    refetch: q.refetch,
  };
}
