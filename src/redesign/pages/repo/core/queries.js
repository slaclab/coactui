"use client";

import { useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { useClusters, useRollupAnchor } from "../../../data/clusters";
import { addDays, rangeOf } from "../../../lib/dates";

// Read queries for the repo-core tabs. RepoCore itself lives in ../repo-context.jsx.

export const REPO_MEMBERS = gql`
  query RepoMembers($filter: RepoInput!) {
    repo(filter: $filter) {
      Id name facility principal leaders users
      allUsers { Id username fullname preferredemail eppnObjs { eppn fullname organization } }
      accessGroupObjs { Id name members }
    }
  }
`;

export const REPO_ACCESS_GROUPS = gql`
  query RepoAccessGroups($filter: RepoInput!) {
    repo(filter: $filter) {
      Id name facility users
      allUsers { username fullname }
      accessGroupObjs { Id name gidnumber state repoid members }
    }
  }
`;

export const REPO_GROUP_NAME_CHECK = gql`
  query RepoGroupNameCheck($f: AccessGroupInput) {
    accessGroups(filter: $f) { Id name }
  }
`;

export const REPO_HISTORY = gql`
  query RepoHistory($filter: RepoInput!, $rf: CoactRequestFilter) {
    repoAuditTrails(repo: $filter) { Id type action actedby actedat details }
    requests(fetchprocessed: true, showmine: false, filter: $rf) {
      Id reqtype requestedby timeofrequest approvalstatus username clustername storagename purpose
      computerequirement percentOfFacility burstPercentOfFacility gigabytes previousName notes canapprove
      audit { actedby actedat notes previous }
    }
  }
`;

export const REPO_PENDING_REQUESTS = gql`
  query RepoPendingRequests($rf: CoactRequestFilter) {
    requests(fetchprocessed: false, showmine: false, filter: $rf) {
      Id reqtype requestedby username timeofrequest approvalstatus canapprove clustername storagename purpose
      gigabytes percentOfFacility computerequirement
    }
  }
`;

export const REPO_OVERVIEW_ALLOCATIONS = gql`
  query RepoOverviewAllocations($filter: RepoInput!) {
    repo(filter: $filter) {
      Id
      currentComputeAllocations { Id clustername start end percentOfFacility burstPercentOfFacility allocated burstAllocated allocatedNodesCount clusterNodeCPUCount }
      currentStorageAllocations { Id storagename purpose rootfolder gigabytes inodes usage { gigabytes inodes } }
    }
  }
`;

export const REPO_RENAME_NAMES = gql`
  query RepoRenameNames {
    allreposandfacility { name facility }
  }
`;

export const REPO_MEMBERS_PASTE = gql`
  query RepoMembersPaste($regexes: [String!]!) {
    usersMatchingUserNames(regexes: $regexes) { username fullname }
  }
`;

export const REPO_SEARCH_USERS = gql`
  query RepoAddSearchUsers($regex: String!) {
    usersMatchingUserName(regex: $regex) { username fullname preferredemail }
  }
`;

export const repoFilter = (repo) => ({ name: repo.name, facility: repo.facility });
export const requestFilter = (repo) => ({ reponame: repo.name, facilityname: repo.facility });

/** Members joined to their user records; a member without a record still gets a row. */
export function useRepoMembers(repo) {
  const q = useQuery(REPO_MEMBERS, { variables: { filter: repoFilter(repo) } });
  const rows = useMemo(() => {
    const r = q.data?.repo;
    if (!r) return [];
    const byName = Object.fromEntries((r.allUsers ?? []).map((u) => [u.username, u]));
    const groupsOf = {};
    for (const g of r.accessGroupObjs ?? []) for (const m of g.members ?? []) (groupsOf[m] ??= []).push(g.name);
    const leaders = new Set(r.leaders ?? []);
    return (r.users ?? []).map((username) => {
      const u = byName[username];
      return {
        username,
        fullname: u?.fullname ?? "",
        email: u?.preferredemail ?? "",
        eppns: u?.eppnObjs ?? [],
        role: username === r.principal ? "PI" : leaders.has(username) ? "Leader" : "Member",
        groups: groupsOf[username] ?? [],
      };
    });
  }, [q.data]);
  return { ...q, rows, groups: q.data?.repo?.accessGroupObjs ?? [], loading: q.loading && !q.data };
}

const NOOP = gql`query RepoOverviewUsageNoop { __typename }`;

function usageDocument(clusterNames) {
  const fields = clusterNames
    .map((c, i) => `c${i}: reportFacilityComputeByDay(clustername: ${JSON.stringify(c)}, range: $range, group: "Day") { repo facility resourceHours }`)
    .join("\n    ");
  return gql`query RepoOverviewUsage7d($range: ReportRangeInput!) {\n    ${fields}\n  }`;
}

/**
 * Usage · 7d for one repo: the same formula as pages/repos-list/queries.js (used resource-h
 * over the 7 days ending at the rollup anchor ÷ allocated × 7 × 24 × cores per node), but the
 * document only covers this repo's clusters. Stand-in for repoUsageSummaries.
 */
export function useRepoUsage7d(repo) {
  const allocs = useQuery(REPO_OVERVIEW_ALLOCATIONS, { variables: { filter: repoFilter(repo) } });
  const { clusters, loading: clustersLoading, error: clustersError } = useClusters();
  const biggest = useMemo(() => [...clusters].sort((a, b) => b.purchasedNodes - a.purchasedNodes)[0]?.name, [clusters]);
  const { anchor, loading: anchorLoading, error: anchorError } = useRollupAnchor(biggest);

  const compute = allocs.data?.repo?.currentComputeAllocations;
  const names = useMemo(() => [...new Set((compute ?? []).filter((a) => a.allocated > 0).map((a) => a.clustername))].sort(), [compute]);
  const doc = useMemo(() => (names.length ? usageDocument(names) : null), [names]);
  const usage = useQuery(doc ?? NOOP, { skip: !doc || !anchor, variables: anchor ? { range: rangeOf(addDays(anchor, -6), anchor) } : undefined });

  const result = useMemo(() => {
    const cores = Object.fromEntries(clusters.map((c) => [c.name, c.nodecpucount]));
    const computeRows = names.map((cluster, i) => {
      const a = compute.find((x) => x.clustername === cluster && x.allocated > 0);
      const used = (usage.data?.[`c${i}`] ?? []).filter((u) => u.repo === repo.name && u.facility === repo.facility).reduce((t, u) => t + u.resourceHours, 0);
      const perNode = cores[cluster] ?? a.clusterNodeCPUCount;
      const capacity = a.allocated * 7 * 24 * (perNode || 0);
      return {
        cluster,
        used,
        pct: capacity ? (used / capacity) * 100 : 0,
        burst: a.burstAllocated > 0 ? (a.burstAllocated / a.allocated) * 100 : 0,
        ready: !!usage.data,
      };
    });
    const storageRows = (allocs.data?.repo?.currentStorageAllocations ?? [])
      .filter((s) => s.gigabytes > 0)
      .map((s) => ({ id: s.Id, purpose: s.purpose, storagename: s.storagename, usedGb: s.usage?.gigabytes ?? 0, allocatedGb: s.gigabytes }));
    return { computeRows, storageRows };
  }, [names, compute, usage.data, clusters, allocs.data, repo.name, repo.facility]);

  return {
    ...result,
    anchor,
    loading: allocs.loading && !allocs.data,
    usageLoading: clustersLoading || anchorLoading || usage.loading,
    error: allocs.error ?? clustersError ?? anchorError ?? usage.error,
    refetch: () => { allocs.refetch(); if (doc && anchor) usage.refetch(); },
  };
}
