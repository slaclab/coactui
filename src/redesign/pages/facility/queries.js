"use client";

import { useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { useClusters, useRollupAnchor } from "../../data/clusters";
import { addDays, rangeOf } from "../../lib/dates";

// Facility detail (spec §5) data. FACILITYDETAILS is split into three independent queries
// (spec §9): core (facility-context.jsx), Live usage and daily rollups, so the Live/Rollup
// cells skeleton on their own. Every hook returns derived values; nothing is copied to state.

export const FACILITY_NAMES = gql`
  query FacilitySwitcher {
    facilityNameDescs { name description }
  }
`;

const LIVE = gql`
  query FacilityLiveUsage {
    pastHour: facilityRecentComputeUsage(pastMinutes: 60, skipQoses: ["preemptable"]) { facility clustername percentUsed resourceHours }
    pastDay: facilityRecentComputeUsage(pastMinutes: 1440, skipQoses: ["preemptable"]) { facility clustername percentUsed resourceHours }
    pastWeek: facilityRecentComputeUsage(pastMinutes: 10080, skipQoses: ["preemptable"]) { facility clustername percentUsed resourceHours }
  }
`;

const ROLLUPS = gql`
  query FacilityRollups($facility: String!, $month: ReportRangeInput!, $ytd: ReportRangeInput!, $lastYear: ReportRangeInput!) {
    month: reportFacilityComputeUsageByCluster(facility: $facility, range: $month) { clustername percentUsed usedResourceHours availableResourceHours }
    ytd: reportFacilityComputeUsageByCluster(facility: $facility, range: $ytd) { clustername percentUsed usedResourceHours }
    lastYear: reportFacilityComputeUsageByCluster(facility: $facility, range: $lastYear) { clustername percentUsed usedResourceHours }
  }
`;

const REPO_SHARES = gql`
  query FacilityRepoShares {
    myRepos { name facility currentComputeAllocations { clustername percentOfFacility burstPercentOfFacility } }
  }
`;

const PENDING = gql`
  query FacilityPendingRequests($filter: CoactRequestFilter!) {
    requests(fetchprocessed: false, showmine: false, filter: $filter) { Id reqtype canapprove }
  }
`;

const PURCHASE_HISTORY = gql`
  query FacilityPurchaseHistory($filter: CoactRequestFilter!) {
    requests(fetchprocessed: true, showmine: false, filter: $filter) { Id requestedby timeofrequest clustername allocated burstPercentOfFacility approvalstatus }
  }
`;

const STORAGE_OPTIONS = gql`
  query FacilityPurchaseOptions {
    storagenames
    storagepurposes
  }
`;

export const INVITE_LOOKUP = gql`
  query FacilityInviteLookup($filter: UserInput!) {
    usersLookupFromService(filter: $filter) { username fullname preferredemail }
  }
`;

export const INVITE_EXISTING = gql`
  query FacilityInviteExisting($eppn: String!) {
    requestsExistingForEPPN(eppn: $eppn) { reqtype facilityname approvalstatus }
  }
`;

/* ---------------------------------- mutations ------------------------------------ */

export const UPDATE_DESCRIPTION = gql`
  mutation FacilityUpdateDescription($facility: FacilityInput!, $newdescription: String!) {
    facilityUpdateDescription(facility: $facility, newdescription: $newdescription) { Id }
  }
`;
export const ADD_CZAR = gql`
  mutation FacilityAddCzar($facility: FacilityInput!, $user: UserInput!) {
    facilityAddCzar(facility: $facility, user: $user) { Id }
  }
`;
export const REMOVE_CZAR = gql`
  mutation FacilityRemoveCzar($facility: FacilityInput!, $user: UserInput!) {
    facilityRemoveCzar(facility: $facility, user: $user) { Id }
  }
`;
export const INVITE_USER = gql`
  mutation FacilityInviteUser($request: CoactRequestInput!) {
    requestNewSDFAccount(request: $request) { Id }
  }
`;
// The schema takes burstPercent (legacy still sends burstNodes, which the API rejects).
export const COMPUTE_PURCHASE = gql`
  mutation FacilityComputePurchase($facility: FacilityInput!, $cluster: ClusterInput!, $purchase: Float!, $burstPercent: Float!) {
    facilityAddUpdateComputePurchase(facility: $facility, cluster: $cluster, purchase: $purchase, burstPercent: $burstPercent) { Id }
  }
`;
export const STORAGE_PURCHASE = gql`
  mutation FacilityStoragePurchase($facility: FacilityInput!, $purpose: String!, $storagename: String, $purchase: Float!) {
    facilityAddUpdateStoragePurchase(facility: $facility, purpose: $purpose, storagename: $storagename, purchase: $purchase) { Id }
  }
`;

/* ------------------------------------- hooks ------------------------------------- */

/** All facility names (alphabetical) for the breadcrumb switcher and the notFound check. */
export function useFacilityNames({ skip = false } = {}) {
  const { data, loading, error } = useQuery(FACILITY_NAMES, { skip });
  const names = useMemo(
    () => (data?.facilityNameDescs ? data.facilityNameDescs.map((f) => f.name).sort((a, b) => a.localeCompare(b)) : null),
    [data],
  );
  return { names, loading, error };
}

/** Live (jobs) % per cluster for one facility: { [cluster]: { hour, day, week } }. Czar/admin only. */
export function useFacilityLive(name, enabled) {
  const { data, loading, error, refetch } = useQuery(LIVE, { skip: !enabled });
  return useMemo(() => {
    const byCluster = {};
    const put = (rows, key) => {
      for (const r of rows ?? []) {
        if (r.facility !== name) continue;
        (byCluster[r.clustername] ??= {})[key] = r.percentUsed;
      }
    };
    put(data?.pastHour, "hour");
    put(data?.pastDay, "day");
    put(data?.pastWeek, "week");
    const empty = !!data && !Object.keys(byCluster).length;
    const bursting = Object.values(byCluster).some((v) => (v.hour ?? 0) > 100);
    return { byCluster, loading: enabled && (loading || (!data && !error)), error, refetch, empty, bursting };
  }, [data, loading, error, refetch, name, enabled]);
}

/**
 * The facility's repo shares from useFacility() when the layout already fetched them (czar/admin),
 * otherwise a fetch of its own while `enabled` (read-only viewers opening a popover).
 */
export function useSharedRepoShares(ctxShares, name, enabled = true) {
  const own = useFacilityRepoShares(name, enabled && !ctxShares?.enabled);
  return ctxShares?.enabled ? ctxShares : own;
}

/** Daily rollup % per cluster, windows anchored on the last day with rollup data. */
export function useFacilityRollups(name) {
  const { clusters, loading: clustersLoading, error: clustersError } = useClusters();
  const biggest = useMemo(() => [...clusters].sort((a, b) => b.purchasedNodes - a.purchasedNodes)[0]?.name, [clusters]);
  const { anchor, loading: anchorLoading, error: anchorError } = useRollupAnchor(biggest);
  const variables = useMemo(() => {
    if (!anchor) return null;
    const year = Number(anchor.slice(0, 4));
    return {
      facility: name,
      month: rangeOf(addDays(anchor, -29), anchor),
      ytd: rangeOf(`${year}-01-01`, anchor),
      lastYear: rangeOf(`${year - 1}-01-01`, `${year - 1}-12-31`),
    };
  }, [anchor, name]);
  const { data, loading, error, refetch } = useQuery(ROLLUPS, { skip: !variables, variables: variables ?? undefined });
  return useMemo(() => {
    const byCluster = {};
    for (const key of ["month", "ytd", "lastYear"]) {
      for (const r of data?.[key] ?? []) (byCluster[r.clustername] ??= {})[key] = r.percentUsed;
    }
    return {
      byCluster,
      anchor,
      loading: clustersLoading || anchorLoading || loading || (!!variables && !data && !error),
      error: clustersError ?? anchorError ?? error,
      refetch,
    };
  }, [data, anchor, anchorLoading, anchorError, loading, error, refetch, variables, clustersLoading, clustersError]);
}

/**
 * Current repo shares of the facility's compute purchases, from the repos the viewer can list
 * (showAll). { byCluster: { [cluster]: [{ repo, pct }] sorted desc }, repoCount }.
 * network-only: myRepos is cached without the showall header (Apollo ignores context).
 */
export function useFacilityRepoShares(name, enabled = true) {
  const { data, loading, error, refetch } = useQuery(REPO_SHARES, { skip: !enabled, context: { showAll: true }, fetchPolicy: "network-only" });
  return useMemo(() => {
    const repos = (data?.myRepos ?? []).filter((r) => r.facility === name);
    const byCluster = {};
    for (const r of repos) {
      for (const a of r.currentComputeAllocations ?? []) {
        if (!(a.percentOfFacility > 0)) continue;
        (byCluster[a.clustername] ??= []).push({ repo: r.name, pct: a.percentOfFacility });
      }
    }
    for (const list of Object.values(byCluster)) list.sort((a, b) => b.pct - a.pct);
    return { enabled, byCluster, repoCount: data ? repos.length : null, loading: enabled && (loading || (!data && !error)), error, refetch };
  }, [data, loading, error, refetch, name, enabled]);
}

/** Pending requests this viewer can approve in the facility (badge + tab count). */
export function useFacilityPending(name, enabled) {
  const { data, loading, error } = useQuery(PENDING, { skip: !enabled, variables: { filter: { facilityname: name } } });
  const count = data ? (data.requests ?? []).filter((r) => r.canapprove).length : null;
  return { count, loading, error };
}

/** FacilityComputeAllocation request records (History). showmine:false is required. */
export function usePurchaseHistory(name) {
  const { data, loading, error, refetch } = useQuery(PURCHASE_HISTORY, {
    variables: { filter: { reqtype: "FacilityComputeAllocation", facilityname: name } },
  });
  return { records: data?.requests ?? [], loading: loading || (!data && !error), error, refetch };
}

/** Storage names and purposes for the storage purchase dialog. */
export function useStorageOptions() {
  const { data, loading, error } = useQuery(STORAGE_OPTIONS);
  return { storagenames: data?.storagenames ?? [], storagepurposes: data?.storagepurposes ?? [], loading, error };
}

/** Clusters joined to the facility's compute purchases: which clusters can still get one. */
export function usePurchaseCoverage(facility) {
  const { clusters, loading, error } = useClusters();
  return useMemo(() => {
    const purchased = new Set((facility?.computepurchases ?? []).map((p) => p.clustername));
    const unpurchased = clusters.filter((c) => !purchased.has(c.name));
    return { clusters, unpurchased, allPurchased: clusters.length > 0 && unpurchased.length === 0, loading, error };
  }, [clusters, facility, loading, error]);
}
