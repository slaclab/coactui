"use client";

import { createContext, useContext, useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { useMounted } from "./apollo";

// One query for "who is looking", shared by the shell and every page. Everything else about
// the viewer (roles, gates) is derived from it below — never copied into component state.
const VIEWER = gql`
  query AppViewer {
    amIRegistered { isRegistered isRegistrationPending eppn fullname }
    whoami { username fullname isAdmin isCzar isImpersonating subjectFacilities }
  }
`;

const ViewerContext = createContext(null);

export function ViewerProvider({ children }) {
  const mounted = useMounted();
  // whoami errors for unregistered users; errorPolicy "all" keeps amIRegistered.
  const { data, loading, error, refetch } = useQuery(VIEWER, { skip: !mounted, errorPolicy: "all" });
  const value = useMemo(() => {
    const w = data?.whoami;
    const viewer = w
      ? {
          username: w.username,
          fullname: w.fullname,
          isAdmin: !!w.isAdmin,
          isImpersonating: !!w.isImpersonating,
          czarOf: w.subjectFacilities ?? [],
        }
      : null;
    return {
      viewer,
      registration: data?.amIRegistered ?? null,
      // Loading until the first response, including the server/hydration render.
      loading: !mounted || loading,
      error: viewer ? null : error,
      refetch,
      can: permissions(viewer),
    };
  }, [data, loading, error, refetch, mounted]);
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer() {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error("useViewer must be used under <AppProviders>");
  return ctx;
}

/**
 * Permission gates, mirroring coact-api (auth.py) so the UI shows only what the API accepts
 * (spec §1.4). Pass a repo shaped like { facility, principal, leaders, users }.
 */
function permissions(v) {
  const isCzarOf = (facility) => !!v && (v.isAdmin || v.czarOf.includes(facility));
  const roleIn = (repo) => {
    if (!v || !repo) return null;
    if (repo.principal === v.username) return "PI";
    if ((repo.leaders ?? []).includes(v.username)) return "Leader";
    if ((repo.users ?? []).includes(v.username)) return "Member";
    if (v.czarOf.includes(repo.facility)) return "Czar view";
    return v.isAdmin ? "Admin view" : null;
  };
  return {
    isAdmin: !!v?.isAdmin,
    isCzar: !!v && v.czarOf.length > 0,
    isCzarOf,
    /** PI, Leader, or the role label a czar/admin sees ("Czar view" / "Admin view"). */
    roleIn,
    /** Add/remove members, make leader, request allocation changes. */
    canEditMembers: (repo) => isCzarOf(repo?.facility) || ["PI", "Leader"].includes(roleIn(repo)),
    /** Change PI, LDAP group, description, compute requirement; rename (never `default`). */
    canManageRepo: (repo) => isCzarOf(repo?.facility),
    canRenameRepo: (repo) => isCzarOf(repo?.facility) && repo?.name !== "default",
    /** Compute allocation on `default` is admin-only (spec §6 Compute). */
    canEditAllocation: (repo) => (repo?.name === "default" ? !!v?.isAdmin : isCzarOf(repo?.facility)),
    /** Purchases are admin-only in the API; czars see them disabled with a reason. */
    canEditPurchases: () => !!v?.isAdmin,
    canManageCzars: (facility) => isCzarOf(facility),
    canEditFeatures: () => !!v?.isAdmin,
    canImpersonate: () => !!v?.isAdmin && !v?.isImpersonating,
  };
}
