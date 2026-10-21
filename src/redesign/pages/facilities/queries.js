"use client";

import { useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { useClusters, useRollupAnchor } from "../../data/clusters";
import { addDays, rangeOf } from "../../lib/dates";
import { useViewer } from "../../providers/viewer";
import { facilityHealth } from "./health";

/*
 * /facilities data (spec §4). Four independent regions so each skeletons / fails on its own
 * (spec §9): the list (metadata + purchases), live usage (7d + past hour), pending requests,
 * and — only when live 7d returns nothing — the daily rollup fallback for Compute · 7d.
 */

const FACILITIES_LIST = gql`
  query FacilitiesList {
    facilitiesIManage {
      name description serviceaccount servicegroup czars
      computepurchases { clustername purchased burstPercent allocated }
      storagepurchases { storagename purpose purchased allocated used }
    }
    allreposandfacility { name facility }
  }
`;

const FACILITIES_LIVE = gql`
  query FacilitiesLive {
    live7d: facilityRecentComputeUsage(pastMinutes: 10080, skipQoses: ["preemptable"]) { facility clustername resourceHours percentUsed }
    pastHour: facilityRecentComputeUsage(pastMinutes: 60, skipQoses: ["preemptable"]) { facility clustername resourceHours percentUsed }
  }
`;

const FACILITIES_PENDING = gql`
  query FacilitiesPending($filter: CoactRequestFilter) {
    requests(fetchprocessed: false, filter: $filter) { Id facilityname approvalstatus }
  }
`;

// Placeholder while the cluster list loads (the query is skipped then).
const NOOP = gql`query FacilitiesRollupNoop { __typename }`;

function rollupDocument(clusterNames) {
  const fields = clusterNames
    .map((c, i) => `c${i}: reportFacilityComputeByDay(clustername: ${JSON.stringify(c)}, range: $range, group: "Day") { facility resourceHours }`)
    .join("\n    ");
  return gql`query FacilitiesRollup7d($range: ReportRangeInput!) {\n    ${fields}\n  }`;
}

const sumBy = (rows, key, val) => {
  const out = {};
  for (const r of rows ?? []) out[key(r)] = (out[key(r)] ?? 0) + val(r);
  return out;
};

/**
 * → { rows, loading, error, refetch,
 *     usage: { source: "live" | "rollup" | null, anchor, loading, error, refetch },
 *     pending: { total, loading, error, refetch },
 *     now: { clusters: [...], storage: { usedGb, purchasedGb }, hasLive, loading, error, refetch } }
 */
export function useFacilities() {
  const { viewer, can } = useViewer();
  const allowed = !!viewer && (can.isAdmin || can.isCzar);

  const list = useQuery(FACILITIES_LIST, { skip: !allowed, fetchPolicy: "network-only", errorPolicy: "all" });
  const live = useQuery(FACILITIES_LIVE, { skip: !allowed, errorPolicy: "all" });
  const pending = useQuery(FACILITIES_PENDING, { skip: !allowed, variables: { filter: { approvalstatus: "NotActedOn" } }, errorPolicy: "all" });
  const { clusters, loading: clustersLoading, error: clustersError } = useClusters();

  // Rollup fallback only when the live 7d window came back empty.
  const liveDone = !!live.data || !!live.error;
  const needRollup = allowed && liveDone && !(live.data?.live7d?.length > 0);
  const biggest = useMemo(() => [...clusters].sort((a, b) => b.purchasedNodes - a.purchasedNodes)[0]?.name, [clusters]);
  const { anchor, loading: anchorLoading, error: anchorError } = useRollupAnchor(needRollup ? biggest : null);
  const names = useMemo(() => clusters.map((c) => c.name), [clusters]);
  const doc = useMemo(() => (names.length ? rollupDocument(names) : null), [names]);
  const rollup = useQuery(doc ?? NOOP, {
    skip: !needRollup || !doc || !anchor,
    variables: anchor ? { range: rangeOf(addDays(anchor, -6), anchor) } : undefined,
  });

  const usageLoading =
    allowed && (!liveDone || clustersLoading || (needRollup && (anchorLoading || (!!anchor && !rollup.data && !rollup.error))));

  const source = useMemo(() => {
    if (live.data?.live7d?.length) return "live";
    if (!needRollup || !rollup.data) return null;
    return names.some((_, i) => rollup.data[`c${i}`]?.length) ? "rollup" : null;
  }, [live.data, needRollup, rollup.data, names]);

  const rows = useMemo(() => {
    if (!list.data) return [];
    const cores = Object.fromEntries(clusters.map((c) => [c.name, c.nodecpucount]));
    const key = (f, c) => `${f}/${c}`;
    const live7d = sumBy(live.data?.live7d, (u) => key(u.facility, u.clustername), (u) => u.percentUsed ?? 0);
    const hour = sumBy(live.data?.pastHour, (u) => key(u.facility, u.clustername), (u) => u.percentUsed ?? 0);
    const rolled = {};
    names.forEach((c, i) => {
      for (const u of rollup.data?.[`c${i}`] ?? []) rolled[key(u.facility, c)] = (rolled[key(u.facility, c)] ?? 0) + u.resourceHours;
    });
    const repoCount = sumBy(list.data.allreposandfacility, (r) => r.facility, () => 1);
    const pendingBy = pending.data ? sumBy(pending.data.requests, (r) => r.facilityname, () => 1) : null;
    const hasHour = (live.data?.pastHour?.length ?? 0) > 0;

    return (list.data.facilitiesIManage ?? []).map((f) => {
      const compute = (f.computepurchases ?? [])
        .filter((p) => p.purchased > 0)
        .map((p) => {
          const k = key(f.name, p.clustername);
          let pct = null;
          if (source === "live") pct = live7d[k] ?? 0;
          else if (source === "rollup" && cores[p.clustername]) pct = ((rolled[k] ?? 0) / (p.purchased * cores[p.clustername] * 24 * 7)) * 100;
          return {
            cluster: p.clustername,
            purchased: p.purchased,
            burstPercent: p.burstPercent ?? 0,
            allocatedPct: p.allocated ?? 0,
            pct,
            hourPct: hasHour ? (hour[k] ?? 0) : null,
          };
        })
        .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || a.cluster.localeCompare(b.cluster));
      const sp = f.storagepurchases ?? [];
      const storage = sp.length
        ? sp.reduce(
            (s, p) => ({ purchasedGb: s.purchasedGb + (p.purchased ?? 0), allocatedGb: s.allocatedGb + (p.allocated ?? 0), usedGb: s.usedGb + (p.used ?? 0) }),
            { purchasedGb: 0, allocatedGb: 0, usedGb: 0 },
          )
        : null;
      const row = {
        name: f.name,
        description: f.description || "",
        czars: f.czars ?? [],
        serviceaccount: f.serviceaccount || "",
        servicegroup: f.servicegroup || "",
        repos: repoCount[f.name] ?? 0,
        pending: pendingBy ? (pendingBy[f.name] ?? 0) : null,
        compute,
        storage: storage && storage.purchasedGb > 0 ? storage : null,
      };
      // Health waits for usage, so Idle/Bursting don't flip in after the badge renders.
      return { ...row, health: usageLoading ? null : facilityHealth(row) };
    });
  }, [list.data, live.data, pending.data, rollup.data, clusters, names, source, usageLoading]);

  // "S3DF right now": per-cluster busy % from the past hour, across all facilities.
  const now = useMemo(() => {
    const hourRh = sumBy(live.data?.pastHour, (u) => u.clustername, (u) => u.resourceHours ?? 0);
    const panelClusters = clusters
      .filter((c) => c.purchasedNodes > 0)
      .sort((a, b) => b.purchasedNodes - a.purchasedNodes)
      .map((c) => ({
        name: c.name,
        nodes: Math.round(c.purchasedNodes),
        gpu: c.nodegpucount > 0,
        pct: live.data?.pastHour?.length ? ((hourRh[c.name] ?? 0) / (c.purchasedNodes * c.nodecpucount)) * 100 : null,
      }));
    const storage = rows.reduce(
      (s, r) => (r.storage ? { usedGb: s.usedGb + r.storage.usedGb, purchasedGb: s.purchasedGb + r.storage.purchasedGb } : s),
      { usedGb: 0, purchasedGb: 0 },
    );
    return {
      clusters: panelClusters,
      storage,
      hasLive: (live.data?.pastHour?.length ?? 0) > 0,
      loading: clustersLoading || !liveDone,
      storageLoading: !list.data && !list.error,
      error: clustersError ?? live.error,
      refetch: live.refetch,
    };
  }, [clusters, clustersLoading, clustersError, live.data, live.error, live.refetch, liveDone, rows, list.data, list.error]);

  return {
    allowed,
    rows,
    loading: allowed && !list.data && !list.error,
    error: list.data ? null : list.error,
    refetch: list.refetch,
    usage: {
      source,
      anchor: source === "rollup" ? anchor : null,
      loading: usageLoading,
      error: live.error,
      fallbackError: anchorError ?? rollup.error,
      fallbackRefetch: rollup.error ? rollup.refetch : undefined,
      refetch: live.refetch,
    },
    pending: {
      total: pending.data ? pending.data.requests?.length ?? 0 : null,
      loading: allowed && !pending.data && !pending.error,
      error: pending.error,
      refetch: pending.refetch,
    },
    now,
  };
}
