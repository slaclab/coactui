"use client";

import { useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { addDays, isoDay, rangeOf } from "../lib/dates";

// Shared, cross-page data hooks. Page-specific queries live next to their page
// (src/redesign/pages/<group>/queries.js).

const CLUSTERS = gql`
  query RedesignClusters {
    clusters { name nodecpucount nodegpucount chargefactor }
    clusterPurchases { clustername totalpurchased }
  }
`;

const ANCHOR = gql`
  query RedesignRollupAnchor($cluster: String!, $range: ReportRangeInput!) {
    reportFacilityComputeByDay(clustername: $cluster, range: $range, group: "Day") { date }
  }
`;


/** Clusters with purchased node totals: [{ name, nodecpucount, nodegpucount, chargefactor, purchasedNodes }]. */
export function useClusters() {
  const { data, loading, error } = useQuery(CLUSTERS);
  return useMemo(() => {
    if (!data) return { loading, error, clusters: [] };
    const purchased = Object.fromEntries((data.clusterPurchases ?? []).map((p) => [p.clustername, p.totalpurchased]));
    const clusters = (data.clusters ?? []).map((c) => ({ ...c, purchasedNodes: purchased[c.name] ?? 0 }));
    return { loading, error, clusters };
  }, [data, loading, error]);
}

/** Latest day with rollup data on a cluster (within 400 days). A usageFreshness resolver
  (spec backend prerequisite 6) would replace this query. */
export function useRollupAnchor(cluster) {
  const today = isoDay(Date.now());
  const { data, loading, error } = useQuery(ANCHOR, {
    skip: !cluster,
    variables: { cluster, range: rangeOf(addDays(today, -400), today) },
  });
  const anchor = useMemo(() => {
    const days = (data?.reportFacilityComputeByDay ?? []).map((r) => r.date.slice(0, 10));
    return days.length ? days.reduce((a, b) => (a > b ? a : b)) : null;
  }, [data]);
  return { anchor, loading: loading || (!data && !!cluster && !error), error };
}

