"use client";

import { gql, useQuery } from "@apollo/client";
import { useViewer } from "../../providers/viewer";

const PURCHASES = gql`
  query UsageStoragePurchases {
    storagenames
    storagepurposes
    facilities { name storagepurchases { storagename purpose purchased allocated used } }
  }
`;

// Latest usage snapshot per current allocation (reportFacilityStorage returns only repoid and
// doesn't filter by purpose — see the group report's backend gaps).
const REPOS = gql`
  query UsageStorageRepos {
    repos {
      Id
      name
      facility
      currentStorageAllocations { Id storagename purpose rootfolder gigabytes inodes usage { gigabytes inodes } }
    }
  }
`;

/** Storage names/purposes and every facility's storage purchases. */
export function useStoragePurchases() {
  const { data, loading, error, refetch } = useQuery(PURCHASES);
  return {
    storagenames: data?.storagenames ?? [],
    storagepurposes: data?.storagepurposes ?? [],
    facilities: data?.facilities ?? [],
    loading: loading || (!data && !error),
    error,
    refetch,
  };
}

/** Repos the viewer can see (all for admins and czars) with their current storage allocations. */
export function useStorageRepos() {
  const { can, loading: viewerLoading } = useViewer();
  const showAll = can.isAdmin || can.isCzar;
  const { data, loading, error, refetch } = useQuery(REPOS, { skip: viewerLoading, context: { showAll } });
  return { repos: data?.repos ?? [], showAll, loading: viewerLoading || loading || (!data && !error), error, refetch };
}
