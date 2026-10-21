"use client";

import { useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { useClusters } from "../../../data/clusters";
import { useRepo } from "../repo-context";

/*
 * Queries for the repo Compute / Storage / Features tabs and the allocation detail pages.
 * Hooks return Apollo state plus rows derived with useMemo; nothing is copied into state.
 * Czars and admins who are not members read through `coactshowall` (repoRecentComputeUsage
 * filters by the viewer's repos), so every query here sends context { showAll }.
 */

export const REPO_COMPUTE_ALLOCATIONS = gql`
  query RepoComputeAllocations($filter: RepoInput!) {
    repo(filter: $filter) {
      Id name facility
      currentComputeAllocations {
        Id clustername start end percentOfFacility burstPercentOfFacility allocated burstAllocated clusterNodeCPUCount
        usage { resourceHours }
        perUserUsage { username resourceHours }
      }
      facilityObj { name computepurchases { clustername purchased } }
    }
  }
`;

const RECENT_FIELDS = "name facility clustername resourceHours percentUsed";
export const REPO_COMPUTE_RECENT = gql`
  query RepoComputeRecent($skip: [String!]!) {
    pastHour: repoRecentComputeUsage(pastMinutes: 60, skipQoses: $skip) { ${RECENT_FIELDS} }
    pastDay: repoRecentComputeUsage(pastMinutes: 1440, skipQoses: $skip) { ${RECENT_FIELDS} }
    pastWeek: repoRecentComputeUsage(pastMinutes: 10080, skipQoses: $skip) { ${RECENT_FIELDS} }
    pastMonth: repoRecentComputeUsage(pastMinutes: 43200, skipQoses: $skip) { ${RECENT_FIELDS} }
  }
`;

export const REPO_COMPUTE_JOBS = gql`
  query RepoComputeJobs($id: MongoId!, $mins: Int!) {
    repoComputeJobs(rca: { Id: $id }, pastXMins: $mins) {
      jobId username qos startTs endTs durationMillis resourceHours normalizedResourceHours
    }
  }
`;

export const REPO_COMPUTE_ALLOCATION_DETAIL = gql`
  query RepoComputeAllocationDetail($filter: RepoInput!, $id: MongoId!) {
    repo(filter: $filter) {
      Id name facility users
      computeAllocation(allocationid: $id) {
        Id clustername start end percentOfFacility burstPercentOfFacility allocated burstAllocated clusterNodeCPUCount
        usage { resourceHours }
        perDateUsage { date resourceHours }
        perUserUsage { username resourceHours }
      }
      currentComputeAllocations { Id clustername start end percentOfFacility burstPercentOfFacility allocated burstAllocated }
      facilityObj { name computepurchases { clustername purchased } }
    }
  }
`;

export const REPO_STORAGE_ALLOCATIONS = gql`
  query RepoStorageAllocations($filter: RepoInput!) {
    repo(filter: $filter) {
      Id name facility
      currentStorageAllocations {
        Id storagename purpose rootfolder start end gigabytes inodes
        usage { gigabytes inodes }
      }
    }
  }
`;

export const REPO_STORAGE_ALLOCATION_DETAIL = gql`
  query RepoStorageAllocationDetail($filter: RepoInput!, $id: MongoId!, $year: Int!) {
    repo(filter: $filter) {
      Id name facility
      storageAllocation(allocationid: $id) {
        Id storagename purpose rootfolder start end gigabytes inodes
        usage { gigabytes inodes }
        perDateUsage(year: $year) { date gigabytes inodes }
      }
    }
  }
`;

export const REPO_FEATURES = gql`
  query RepoFeatures($filter: RepoInput!) {
    repo(filter: $filter) { Id name facility features { name state options } }
  }
`;

export const REPO_FEATURE_HISTORY = gql`
  query RepoFeatureHistory($repo: RepoInput!) {
    repoAuditTrails(repo: $repo) { Id action actedby actedat details }
  }
`;

export const REPO_RESOURCE_REQUESTS = gql`
  query RepoResourceRequests($filter: CoactRequestFilter) {
    requests(fetchprocessed: false, showmine: false, filter: $filter) {
      Id reqtype approvalstatus clustername purpose storagename allocationid
      percentOfFacility burstPercentOfFacility gigabytes inodes requestedby timeofrequest
    }
  }
`;

/** context for every query on a repo page: czars/admins who aren't members need showAll. */
export function useRepoQueryContext() {
  const { role } = useRepo();
  return useMemo(() => ({ showAll: role === "Czar view" || role === "Admin view" }), [role]);
}

const filterOf = (facility, name) => ({ facility, name });

export function useRepoCompute() {
  const { facility, name } = useRepo();
  const context = useRepoQueryContext();
  const q = useQuery(REPO_COMPUTE_ALLOCATIONS, { variables: { filter: filterOf(facility, name) }, context });
  const { clusters, error: clustersError } = useClusters();
  return useMemo(() => {
    const repo = q.data?.repo;
    const cores = Object.fromEntries(clusters.map((c) => [c.name, c.nodecpucount]));
    const allocations = [...(repo?.currentComputeAllocations ?? [])].sort((a, b) => a.clustername.localeCompare(b.clustername));
    return {
      loading: q.loading && !q.data,
      error: q.error ?? clustersError,
      refetch: q.refetch,
      allocations,
      facilityObj: repo?.facilityObj ?? null,
      cores,
      clusters,
    };
  }, [q.data, q.loading, q.error, q.refetch, clusters, clustersError]);
}

/** Past hour / 24h / 7d / 30d. Preemptable jobs are skipped unless includePreempt. */
export function useRecentComputeUsage(includePreempt) {
  const context = useRepoQueryContext();
  const q = useQuery(REPO_COMPUTE_RECENT, { variables: { skip: includePreempt ? [] : ["preemptable"] }, context });
  return { data: q.data, loading: q.loading && !q.data, error: q.error, refetch: q.refetch };
}

export function useComputeJobs(allocationId, minutes) {
  const context = useRepoQueryContext();
  const q = useQuery(REPO_COMPUTE_JOBS, { skip: !allocationId, variables: { id: allocationId, mins: minutes }, context });
  const rows = useMemo(
    () => [...(q.data?.repoComputeJobs ?? [])].sort((a, b) => String(b.endTs ?? "").localeCompare(String(a.endTs ?? ""))),
    [q.data],
  );
  return { rows, loading: q.loading && !q.data, error: q.error, refetch: q.refetch };
}

export function useComputeAllocationDetail(allocationId) {
  const { facility, name } = useRepo();
  const context = useRepoQueryContext();
  const q = useQuery(REPO_COMPUTE_ALLOCATION_DETAIL, { variables: { filter: filterOf(facility, name), id: allocationId }, context });
  const { clusters } = useClusters();
  return useMemo(() => {
    const repo = q.data?.repo;
    const alloc = repo?.computeAllocation ?? null;
    return {
      loading: q.loading && !q.data,
      error: q.error,
      refetch: q.refetch,
      repo,
      alloc,
      notFound: !!q.data && !alloc,
      facilityObj: repo?.facilityObj ?? null,
      cores: clusters.find((c) => c.name === alloc?.clustername)?.nodecpucount ?? 0,
    };
  }, [q.data, q.loading, q.error, q.refetch, clusters]);
}

export function useRepoStorage() {
  const { facility, name } = useRepo();
  const context = useRepoQueryContext();
  const q = useQuery(REPO_STORAGE_ALLOCATIONS, { variables: { filter: filterOf(facility, name) }, context });
  const allocations = useMemo(
    () => [...(q.data?.repo?.currentStorageAllocations ?? [])].sort((a, b) => a.purpose.localeCompare(b.purpose) || a.storagename.localeCompare(b.storagename)),
    [q.data],
  );
  return { allocations, loading: q.loading && !q.data, error: q.error, refetch: q.refetch };
}

export function useStorageAllocationDetail(allocationId, year) {
  const { facility, name } = useRepo();
  const context = useRepoQueryContext();
  const q = useQuery(REPO_STORAGE_ALLOCATION_DETAIL, { variables: { filter: filterOf(facility, name), id: allocationId, year }, context });
  return useMemo(() => {
    const alloc = q.data?.repo?.storageAllocation ?? null;
    const series = [...(alloc?.perDateUsage ?? [])]
      .map((u) => ({ date: u.date.slice(0, 10), gigabytes: u.gigabytes ?? 0, inodes: u.inodes ?? 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return { alloc, series, loading: q.loading && !q.data, error: q.error, refetch: q.refetch, notFound: !!q.data && !alloc };
  }, [q.data, q.loading, q.error, q.refetch]);
}

export function useRepoFeatures() {
  const { facility, name } = useRepo();
  const context = useRepoQueryContext();
  const q = useQuery(REPO_FEATURES, { variables: { filter: filterOf(facility, name) }, context });
  const features = useMemo(() => [...(q.data?.repo?.features ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [q.data]);
  return { features, loading: q.loading && !q.data, error: q.error, refetch: q.refetch };
}

/** Latest feature changes from the repo audit trail (actions mentioning "feature"). */
export function useFeatureHistory(limit = 3) {
  const { facility, name } = useRepo();
  const context = useRepoQueryContext();
  const q = useQuery(REPO_FEATURE_HISTORY, { variables: { repo: filterOf(facility, name) }, context });
  const entries = useMemo(
    () =>
      (q.data?.repoAuditTrails ?? [])
        .filter((e) => /feature/i.test(e.action ?? ""))
        .sort((a, b) => String(b.actedat).localeCompare(String(a.actedat)))
        .slice(0, limit),
    [q.data, limit],
  );
  return { entries, loading: q.loading && !q.data, error: q.error, refetch: q.refetch };
}

/** Pending (NotActedOn) compute or storage allocation requests for this repo. */
export function usePendingResourceRequests(reqtype) {
  const { facility, name } = useRepo();
  const context = useRepoQueryContext();
  // Only whitelisted CoactRequestFilter fields are sent (spec Bugs: requests.js).
  const q = useQuery(REPO_RESOURCE_REQUESTS, { variables: { filter: { reponame: name, facilityname: facility, reqtype } }, context });
  const pending = useMemo(
    () => (q.data?.requests ?? []).filter((r) => r.reqtype === reqtype && r.approvalstatus === "NotActedOn").sort((a, b) => String(b.timeofrequest).localeCompare(String(a.timeofrequest))),
    [q.data, reqtype],
  );
  return { pending, error: q.error };
}
