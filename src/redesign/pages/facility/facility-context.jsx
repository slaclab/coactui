"use client";

import { createContext, useContext, useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { useMounted } from "../../providers/apollo";
import { useViewer } from "../../providers/viewer";
import { useFacilityNames, useFacilityRepoShares } from "./queries";

// The facility every tab of /facilities/[name] works on (useFacility()). Header and Overview
// share this one cached document; mutations refetch it with refetchQueries: ["FacilityCore"].
// Every mutation reads `name` from here (the route param) — never from props (legacy
// facility.js:877–914 sent the undefined props.facilityname).
// Do NOT select computeallocations { start end }: those resolvers error on every record.
export const FACILITY_CORE = gql`
  query FacilityCore($filter: FacilityInput!) {
    facility(filter: $filter) {
      Id name description resources serviceaccount servicegroup czars
      czarObjs { username fullname }
      computepurchases { clustername purchased burstPercent allocated }
      storagepurchases { storagename purpose purchased allocated used }
    }
  }
`;

const FacilityContext = createContext(null);

export function FacilityProvider({ name, children }) {
  const mounted = useMounted();
  const { viewer, can, loading: viewerLoading } = useViewer();
  const { data, loading, error, refetch } = useQuery(FACILITY_CORE, { skip: !mounted, variables: { filter: { name } } });
  // facility(filter:{name}) errors ("list index out of range") for unknown names instead of
  // returning null, so "not found" is derived from the list of facility names.
  const { names, error: namesError } = useFacilityNames({ skip: !mounted });
  // Repo shares (~900 repos, network-only) are fetched once here for czars/admins and shared by
  // the header repo count, the Top repos popovers and the compute purchase preview.
  const shares = useFacilityRepoShares(name, mounted && can.isCzarOf(name));
  const value = useMemo(() => {
    const facility = data?.facility ?? null;
    const notFound = !!names && !names.includes(name);
    // Hold a core error back until the name list can tell "unknown facility" from a failure.
    const coreError = notFound || (!names && !namesError) ? null : error;
    const czarHere = !!viewer?.czarOf.includes(name);
    const canManage = can.isCzarOf(name);
    return {
      name,
      facility,
      loading: !mounted || loading || (!facility && !coreError && !notFound),
      error: coreError,
      notFound,
      refetch,
      /** All facility names, alphabetical (breadcrumb switcher); null until loaded. */
      names,
      /** useFacilityRepoShares result; `enabled` is false for read-only viewers (fetch on demand). */
      shares,
      viewerLoading,
      /** "Admin" | "Czar" | "Read-only" (spec §8 role badge). */
      role: can.isAdmin ? "Admin" : czarHere ? "Czar" : "Read-only",
      /** Header actions, Invite, Edit description, Requests/History tabs, Live usage. */
      canManage,
      canManageCzars: can.canManageCzars(name),
      /** Purchases are admin-only in the API; czars see them disabled with this reason. */
      canEditPurchases: can.canEditPurchases(),
      purchaseGate: can.canEditPurchases() ? undefined : "Only admins can change purchases",
    };
  }, [name, data, loading, error, refetch, mounted, can, viewer, viewerLoading, names, namesError, shares]);
  return <FacilityContext.Provider value={value}>{children}</FacilityContext.Provider>;
}

export function useFacility() {
  const ctx = useContext(FacilityContext);
  if (!ctx) throw new Error("useFacility must be used inside the facility page layout");
  return ctx;
}
