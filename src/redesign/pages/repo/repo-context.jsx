"use client";

import { createContext, useContext, useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { useMounted } from "../../providers/apollo";
import { useViewer } from "../../providers/viewer";

// The repo every tab of /repos/[facility]/[name] works on. Tabs read it with useRepo() and
// fetch their own detail (members, allocations, …) with their own queries; after a
// mutation they refetch by operation name (refetchQueries: ["RepoCore", …]).
export const REPO_CORE = gql`
  query RepoCore($filter: RepoInput!) {
    repo(filter: $filter) {
      Id name facility principal leaders users group description computerequirement state
      features { name state }
      accessGroupObjs { name }
      allUsers { username fullname }
    }
  }
`;

const RepoContext = createContext(null);

/** "You: …" badge copy: PI / Leader / Member, "LCLS czar", "Admin". */
const roleLabelOf = (role, facility) => (role === "Czar view" ? `${facility} czar` : role === "Admin view" ? "Admin" : role);

export function RepoProvider({ facility, name, children }) {
  const mounted = useMounted();
  const { can, loading: viewerLoading } = useViewer();
  const { data, loading, error, refetch } = useQuery(REPO_CORE, { skip: !mounted, variables: { filter: { facility, name } } });
  const value = useMemo(() => {
    const repo = data?.repo ?? null;
    const role = can.roleIn(repo);
    return {
      facility,
      name,
      repo,
      loading: !mounted || (loading && !data),
      error,
      notFound: mounted && !loading && !error && !repo,
      refetch,
      role,
      roleLabel: roleLabelOf(role, facility),
      isDefault: name === "default",
      // Derived permission flags (mirror coact-api auth.py via useViewer().can).
      canEdit: !!repo && !viewerLoading && can.canEditMembers(repo),
      canManage: !!repo && !viewerLoading && can.canManageRepo(repo),
      canRename: !!repo && !viewerLoading && can.canRenameRepo(repo),
      canEditAlloc: !!repo && !viewerLoading && can.canEditAllocation(repo),
      /** username → full name, for the header and the PI combobox. */
      fullnameOf: Object.fromEntries((repo?.allUsers ?? []).map((u) => [u.username, u.fullname])),
    };
  }, [facility, name, data, loading, error, refetch, mounted, can, viewerLoading]);
  return <RepoContext.Provider value={value}>{children}</RepoContext.Provider>;
}

export function useRepo() {
  const ctx = useContext(RepoContext);
  if (!ctx) throw new Error("useRepo must be used inside the repo page layout");
  return ctx;
}
