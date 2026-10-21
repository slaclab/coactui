"use client";

import { useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { useClusters, useRollupAnchor } from "../../data/clusters";
import { addDays, rangeOf } from "../../lib/dates";
import { useViewer } from "../../providers/viewer";

/* ======================================================================================
 * /repos/info data. Server data stays in Apollo; rows are derived with useMemo.
 * Every operation name is prefixed (RedesignRepos, ReposList…, ReposPeek…, ReposRequest…).
 * ====================================================================================== */

const REPOS = gql`
  query RedesignRepos {
    myRepos {
      Id name facility principal leaders users group description computerequirement
      currentComputeAllocations { Id clustername start allocated burstAllocated percentOfFacility burstPercentOfFacility clusterNodeCPUCount }
      currentStorageAllocations { Id storagename purpose gigabytes usage { gigabytes } }
    }
  }
`;

// Compute · 7d / 30 days are a client-side stand-in for repoUsageSummaries (spec §11): one
// reportFacilityComputeByDay per cluster for the window ending at the rollup anchor, joined to
// each repo's allocations. Placeholder document while the cluster list loads (query skipped).
const NOOP = gql`query ReposListNoop { __typename }`;

function usageDocument(clusterNames, operation) {
  const fields = clusterNames
    .map((c, i) => `c${i}: reportFacilityComputeByDay(clustername: ${JSON.stringify(c)}, range: $range, group: "Day") { repo facility resourceHours }`)
    .join("\n    ");
  return gql`query ${operation}($range: ReportRangeInput!) {\n    ${fields}\n  }`;
}

/** Resource-hours per `facility/repo/cluster` over `days` ending at the rollup anchor. */
function useRollupUsage(days, operation, { skip = false } = {}) {
  const { clusters, loading: clustersLoading, error: clustersError } = useClusters();
  const biggest = useMemo(() => [...clusters].sort((a, b) => b.purchasedNodes - a.purchasedNodes)[0]?.name, [clusters]);
  const { anchor, loading: anchorLoading, error: anchorError } = useRollupAnchor(biggest);
  const names = useMemo(() => clusters.map((c) => c.name), [clusters]);
  const doc = useMemo(() => (names.length ? usageDocument(names, operation) : null), [names, operation]);
  const usage = useQuery(doc ?? NOOP, {
    skip: skip || !doc || !anchor,
    variables: anchor ? { range: rangeOf(addDays(anchor, -(days - 1)), anchor) } : undefined,
  });
  const used = useMemo(() => {
    const m = {};
    names.forEach((c, i) => {
      for (const u of usage.data?.[`c${i}`] ?? []) {
        const key = `${u.facility}/${u.repo}/${c}`;
        m[key] = (m[key] ?? 0) + u.resourceHours;
      }
    });
    return m;
  }, [usage.data, names]);
  return {
    used,
    clusters,
    anchor,
    loading: !skip && (clustersLoading || anchorLoading || usage.loading || (!!doc && !!anchor && !usage.data && !usage.error)),
    error: clustersError ?? anchorError ?? usage.error,
    refetch: usage.refetch,
  };
}

/**
 * One repo-level row for the Overview preset and the peek. Exported so the peek can shape a
 * repo fetched on its own (deep link outside the current scope) the same way.
 */
export function toRepoRow(r, { used, cores, can }) {
  const computeAllocs = (r.currentComputeAllocations ?? [])
    .filter((a) => a.allocated > 0 && (cores[a.clustername] || a.clusterNodeCPUCount))
    .map((a) => {
      const perNode = cores[a.clustername] || a.clusterNodeCPUCount;
      const usedRh = used ? used[`${r.facility}/${r.name}/${a.clustername}`] ?? 0 : null;
      // Same denominator as the legacy allocation page: nodes × days × 24 × cores per node.
      const availRh = a.allocated * 7 * 24 * perNode;
      return {
        id: a.Id,
        cluster: a.clustername,
        usedRh,
        availRh,
        pct: usedRh == null ? null : (usedRh / availRh) * 100,
        burst: a.burstAllocated > 0 ? (a.burstAllocated / a.allocated) * 100 : 0,
      };
    })
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  const storageAllocs = (r.currentStorageAllocations ?? [])
    .filter((s) => s.gigabytes > 0)
    .map((s) => ({ id: s.Id, purpose: s.purpose, storagename: s.storagename, usedGb: s.usage?.gigabytes ?? 0, allocatedGb: s.gigabytes }))
    .sort((a, b) => b.usedGb / b.allocatedGb - a.usedGb / a.allocatedGb);
  const worst = computeAllocs[0];
  return {
    id: `${r.facility}/${r.name}`,
    Id: r.Id,
    name: r.name,
    facility: r.facility,
    principal: r.principal ?? "—",
    leaders: r.leaders ?? [],
    users: r.users ?? [],
    members: (r.users ?? []).length,
    group: r.group,
    description: r.description,
    computerequirement: r.computerequirement,
    computeAllocs,
    storageAllocs,
    // Every current allocation, including zero ones (request dialogs edit these).
    computeRaw: (r.currentComputeAllocations ?? []).map((a) => ({
      id: a.Id,
      cluster: a.clustername,
      start: a.start,
      allocated: a.allocated ?? 0,
      percentOfFacility: a.percentOfFacility ?? 0,
      burstPercentOfFacility: a.burstPercentOfFacility ?? 0,
    })),
    storageRaw: (r.currentStorageAllocations ?? []).map((s) => ({ id: s.Id, purpose: s.purpose, storagename: s.storagename, gigabytes: s.gigabytes ?? 0, usedGb: s.usage?.gigabytes ?? 0 })),
    compute: worst && worst.pct != null ? { ...worst, more: computeAllocs.length - 1 } : null,
    hasCompute: computeAllocs.length > 0,
    storage: storageAllocs[0] ?? null,
    role: can.roleIn(r) ?? "Member",
  };
}

/** Overview rows (contract: useRepos(showAll) → { rows, loading, usageLoading, error, … }). */
export function useRepos(showAll) {
  const { viewer, can } = useViewer();
  const repos = useQuery(REPOS, { skip: !viewer, context: { showAll }, fetchPolicy: "network-only" });
  const usage = useRollupUsage(7, "RedesignRepoUsage7d");
  const cores = useMemo(() => Object.fromEntries(usage.clusters.map((c) => [c.name, c.nodecpucount])), [usage.clusters]);
  const usageReady = !usage.loading && !usage.error;

  const rows = useMemo(() => {
    if (!viewer || !repos.data) return [];
    return repos.data.myRepos.map((r) => toRepoRow(r, { used: usageReady ? usage.used : null, cores, can }));
  }, [viewer, can, repos.data, usage.used, usageReady, cores]);

  return {
    rows,
    anchor: usage.anchor,
    used: usageReady ? usage.used : null,
    cores,
    loading: repos.loading || !repos.data,
    usageLoading: usage.loading,
    error: repos.error,
    usageError: usage.error,
    refetch: repos.refetch,
    refetchUsage: usage.refetch,
  };
}

/* ------------------------------- Compute preset ------------------------------------- */

const COMPUTE = gql`
  query ReposListCompute {
    myRepos {
      Id name facility principal leaders users group description
      currentComputeAllocations {
        Id clustername clusterNodeCPUCount start end percentOfFacility allocated
        burstPercentOfFacility burstAllocated allocatedNodesCount usage { resourceHours }
      }
    }
    facilities { name computepurchases { clustername purchased } }
  }
`;

// Live (jobs) windows split from the allocations so "Include preemptable" refetches only these.
const LIVE = gql`
  query ReposListLive($skipQoses: [String!]!) {
    pastHour: repoRecentComputeUsage(pastMinutes: 60, skipQoses: $skipQoses) { name facility clustername percentUsed resourceHours }
    pastDay: repoRecentComputeUsage(pastMinutes: 1440, skipQoses: $skipQoses) { name facility clustername percentUsed resourceHours }
    pastWeek: repoRecentComputeUsage(pastMinutes: 10080, skipQoses: $skipQoses) { name facility clustername percentUsed resourceHours }
  }
`;

export const LIVE_WINDOWS = ["pastHour", "pastDay", "pastWeek"];

/** One row per repo × cluster (plus one "No allocation" row for repos without any). */
export function useComputeRows({ showAll, includePreempt, enabled }) {
  const { viewer, can } = useViewer();
  const q = useQuery(COMPUTE, { skip: !viewer || !enabled, context: { showAll }, fetchPolicy: "network-only" });
  const live = useQuery(LIVE, { skip: !viewer || !enabled, context: { showAll }, variables: { skipQoses: includePreempt ? [] : ["preemptable"] } });
  const rollup = useRollupUsage(30, "ReposListRollup30d", { skip: !enabled });

  const rows = useMemo(() => {
    if (!viewer || !q.data) return [];
    const purchases = Object.fromEntries(
      (q.data.facilities ?? []).map((f) => [f.name, Object.fromEntries((f.computepurchases ?? []).map((p) => [p.clustername, p.purchased]))]),
    );
    const cores = Object.fromEntries(rollup.clusters.map((c) => [c.name, c.nodecpucount]));
    const liveBy = Object.fromEntries(
      LIVE_WINDOWS.map((w) => [w, Object.fromEntries((live.data?.[w] ?? []).map((u) => [`${u.facility}/${u.name}/${u.clustername}`, u]))]),
    );
    const out = [];
    for (const r of q.data.myRepos) {
      const repo = {
        id: `${r.facility}/${r.name}`,
        name: r.name,
        facility: r.facility,
        principal: r.principal ?? "—",
        leaders: r.leaders ?? [],
        users: r.users ?? [],
        group: r.group,
        description: r.description,
        role: can.roleIn(r) ?? "Member",
      };
      const allocs = [...(r.currentComputeAllocations ?? [])].sort((a, b) => a.clustername.localeCompare(b.clustername));
      if (!allocs.length) {
        out.push({ ...repo, rowId: `${repo.id}/-`, repoId: repo.id, repo, first: true, alloc: null, rollup30Rh: 0 });
        continue;
      }
      allocs.forEach((a, i) => {
        const key = `${r.facility}/${r.name}/${a.clustername}`;
        const purchased = purchases[r.facility]?.[a.clustername] ?? 0;
        // Legacy fallback: an allocation stored only as % of facility.
        const allocated = a.allocated || (purchased && a.percentOfFacility ? (purchased * a.percentOfFacility) / 100 : 0);
        const perNode = a.clusterNodeCPUCount || cores[a.clustername] || 0;
        const rollup30Rh = rollup.used[key] ?? 0;
        const liveCells = Object.fromEntries(
          LIVE_WINDOWS.map((w) => {
            const u = liveBy[w][key];
            if (!u) return [w, null];
            return [w, { facilityPct: u.percentUsed, repoPct: allocated > 0 ? (u.percentUsed * purchased) / allocated : null, resourceHours: u.resourceHours }];
          }),
        );
        out.push({
          ...repo,
          rowId: `${key}`,
          repoId: repo.id,
          repo,
          first: i === 0,
          alloc: {
            id: a.Id,
            cluster: a.clustername,
            start: a.start,
            end: a.end,
            percentOfFacility: a.percentOfFacility ?? 0,
            burstPercentOfFacility: a.burstPercentOfFacility ?? 0,
            allocated,
            nodes: a.allocatedNodesCount ?? allocated,
            burstPct: a.burstAllocated > 0 && allocated > 0 ? (a.burstAllocated / allocated) * 100 : 0,
            purchased,
            perNode,
            totalUsedRh: (a.usage ?? []).reduce((s, u) => s + (u.resourceHours ?? 0), 0),
          },
          live: liveCells,
          rollup30Rh,
          rollup30Pct: allocated > 0 && perNode > 0 ? (rollup30Rh / (allocated * 30 * 24 * perNode)) * 100 : null,
        });
      });
    }
    return out;
  }, [viewer, can, q.data, live.data, rollup.used, rollup.clusters]);

  return {
    rows,
    purchases: q.data?.facilities,
    loading: q.loading || (!!enabled && !q.data && !q.error),
    error: q.error,
    refetch: q.refetch,
    liveLoading: live.loading,
    liveError: live.error,
    refetchLive: live.refetch,
    rollupLoading: rollup.loading,
    rollupError: rollup.error,
    refetchRollup: rollup.refetch,
  };
}

/* ------------------------------- Storage preset ------------------------------------- */

const STORAGE = gql`
  query ReposListStorage {
    myRepos {
      Id name facility principal leaders users group description
      currentStorageAllocations { Id storagename purpose rootfolder start end gigabytes inodes usage { gigabytes inodes } }
    }
  }
`;

/** One row per repo × storage allocation (purpose). */
export function useStorageRows({ showAll, enabled }) {
  const { viewer, can } = useViewer();
  const q = useQuery(STORAGE, { skip: !viewer || !enabled, context: { showAll }, fetchPolicy: "network-only" });
  const rows = useMemo(() => {
    if (!viewer || !q.data) return [];
    const out = [];
    for (const r of q.data.myRepos) {
      const repo = {
        id: `${r.facility}/${r.name}`,
        name: r.name,
        facility: r.facility,
        principal: r.principal ?? "—",
        leaders: r.leaders ?? [],
        users: r.users ?? [],
        group: r.group,
        description: r.description,
        role: can.roleIn(r) ?? "Member",
      };
      [...(r.currentStorageAllocations ?? [])]
        .sort((a, b) => (a.purpose ?? "").localeCompare(b.purpose ?? ""))
        .forEach((s, i) =>
          out.push({
            ...repo,
            rowId: `${repo.id}/${s.Id}`,
            repoId: repo.id,
            repo,
            first: i === 0,
            alloc: {
              id: s.Id,
              purpose: s.purpose,
              storagename: s.storagename,
              rootfolder: s.rootfolder,
              allocatedGb: s.gigabytes ?? 0,
              usedGb: s.usage?.gigabytes ?? 0,
              inodes: s.inodes ?? 0,
              usedInodes: s.usage?.inodes ?? 0,
            },
          }),
        );
    }
    return out;
  }, [viewer, can, q.data]);
  return { rows, loading: q.loading || (!!enabled && !q.data && !q.error), error: q.error, refetch: q.refetch };
}

/* ------------------------------- Peek ----------------------------------------------- */

const PEEK_REPO = gql`
  query ReposPeek($repo: RepoInput!) {
    repo(filter: $repo) {
      Id name facility principal leaders users group description computerequirement
      currentComputeAllocations { Id clustername allocated burstAllocated clusterNodeCPUCount }
      currentStorageAllocations { Id storagename purpose gigabytes usage { gigabytes } }
    }
  }
`;

/** A repo that isn't in the loaded rows (deep link outside the current scope). */
export function usePeekRepo(id, { skip, used, cores }) {
  const { can } = useViewer();
  const [facility, ...rest] = (id ?? "").split("/");
  const name = rest.join("/");
  const q = useQuery(PEEK_REPO, { skip: skip || !facility || !name, variables: { repo: { facility, name } } });
  const row = useMemo(() => (q.data?.repo ? toRepoRow(q.data.repo, { used, cores, can }) : null), [q.data, used, cores, can]);
  return { row, loading: q.loading, error: q.error, refetch: q.refetch };
}

const PEEK_REQUESTS = gql`
  query ReposPeekRequests($filter: CoactRequestFilter) {
    requests(fetchprocessed: false, showmine: false, filter: $filter) {
      Id reqtype approvalstatus requestedby timeofrequest username clustername storagename purpose gigabytes percentOfFacility canapprove
    }
  }
`;

export function usePeekRequests(repo) {
  const q = useQuery(PEEK_REQUESTS, {
    skip: !repo,
    variables: repo ? { filter: { reponame: repo.name, facilityname: repo.facility } } : undefined,
    fetchPolicy: "cache-and-network",
  });
  return { requests: q.data?.requests ?? [], loading: q.loading && !q.data, error: q.error, refetch: q.refetch };
}

/* ------------------------------- Request dialogs ------------------------------------ */

const REQUEST_OPTIONS = gql`
  query ReposRequestOptions {
    whoami { username eppns facilities }
    facilityNameDescs { name description }
    allreposandfacility { name facility }
  }
`;

/** whoami.facilities/eppns + facility descriptions + every repo name, loaded only when needed. */
export function useRequestOptions(enabled) {
  const { viewer } = useViewer();
  const q = useQuery(REQUEST_OPTIONS, { skip: !viewer || !enabled });
  return useMemo(() => {
    const d = q.data;
    return {
      loading: q.loading || (!!enabled && !d && !q.error),
      error: q.error,
      username: d?.whoami?.username ?? viewer?.username,
      eppns: d?.whoami?.eppns ?? [],
      myFacilities: d?.whoami?.facilities ?? [],
      allFacilities: d?.facilityNameDescs ?? [],
      allRepos: d?.allreposandfacility ?? [],
    };
  }, [q.data, q.loading, q.error, enabled, viewer]);
}

export const REQUEST_MEMBERSHIP = gql`
  mutation ReposRequestMembership($request: CoactRequestInput!) { requestRepoMembership(request: $request) { Id } }
`;
export const REQUEST_NEW_REPO = gql`
  mutation ReposRequestNewRepo($request: CoactRequestInput!) { requestNewRepo(request: $request) { Id } }
`;
export const REQUEST_FACILITY_ACCESS = gql`
  mutation ReposRequestFacilityAccess($request: CoactRequestInput!) { requestNewSDFAccount(request: $request) { Id } }
`;
export const REQUEST_COMPUTE = gql`
  mutation ReposRequestCompute($request: CoactRequestInput!) { requestRepoComputeAllocation(request: $request) { Id } }
`;
export const REQUEST_STORAGE = gql`
  mutation ReposRequestStorage($request: CoactRequestInput!) { requestRepoStorageAllocation(request: $request) { Id } }
`;
export const APPROVE_REQUEST = gql`
  mutation ReposApproveRequest($id: String!) { requestApprove(id: $id) }
`;
export const ADD_USER = gql`
  mutation ReposAddUser($repo: RepoInput!, $user: UserInput!) { repoAddUser(repo: $repo, user: $user) { name } }
`;

// Compute-allocation editing needs the facility's purchases per cluster (cheap, shared doc).
const PURCHASES = gql`
  query ReposRequestPurchases {
    facilities { name computepurchases { clustername purchased } }
    clusters { name nodecpucount }
  }
`;
export function useFacilityPurchases(enabled) {
  const q = useQuery(PURCHASES, { skip: !enabled });
  return useMemo(() => {
    const purchases = Object.fromEntries(
      (q.data?.facilities ?? []).map((f) => [f.name, Object.fromEntries((f.computepurchases ?? []).map((p) => [p.clustername, p.purchased]))]),
    );
    return { purchases, clusters: q.data?.clusters ?? [], loading: q.loading, error: q.error };
  }, [q.data, q.loading, q.error]);
}
