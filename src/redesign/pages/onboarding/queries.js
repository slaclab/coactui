"use client";

import { useCallback, useMemo } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { formatInt, formatStorage } from "../../lib/format";

// Don't select requestObj.reqtype / timeofrequest here: for registered users requestObj is an
// unset placeholder and those two resolvers raise (UnsetType). The request date comes from
// OnboardingRequestDate, which only runs when a real request exists.
const REGISTRATION_FIELDS = `
  isRegistered isRegistrationPending eppn username fullname email requestId
`;
const REQUEST_FIELDS = `Id approvalstatus preferredUserName eppn facilityname notes audit { actedat actedby notes previous }`;

const REGISTRATION = gql`
  query OnboardingRegistration {
    amIRegistered {
      ${REGISTRATION_FIELDS}
      requestObj { ${REQUEST_FIELDS} }
    }
    facilityNameDescs { name description }
  }
`;

// The request date for an applicant with a request. requestsExistingForEPPN is admin-only in
// coact-api, so the date comes from amIRegistered.requestObj, which is safe to read only when a
// real request exists (requestId set). amIRegistered isn't normalised in the Apollo cache, so
// this selects a superset of OnboardingRegistration: writing it never drops fields that query
// needs.
const REQUEST_DATE = gql`
  query OnboardingRequestDate {
    amIRegistered {
      ${REGISTRATION_FIELDS}
      requestObj { ${REQUEST_FIELDS} timeofrequest }
    }
  }
`;

const HALL_STATS = gql`
  query OnboardingHallStats {
    clusters { name nodecpucount nodegpucount }
    clusterPurchases { clustername totalpurchased }
    facilities { name storagepurchases { purchased } }
  }
`;

const REQUEST_ACCOUNT = gql`
  mutation OnboardingRequestAccount($request: CoactRequestInput!) {
    requestNewSDFAccount(request: $request) { Id }
  }
`;

const COMPLETE_PREAPPROVED = gql`
  mutation OnboardingCompletePreApproved($id: String!) {
    requestApprovePreApproved(id: $id)
  }
`;

const REFETCH = ["AppViewer", "OnboardingRegistration"];

export function useRegistration({ skip = false } = {}) {
  const { data, loading, error, refetch } = useQuery(REGISTRATION, { skip, fetchPolicy: "cache-and-network" });
  return {
    registration: data?.amIRegistered ?? null,
    facilities: data?.facilityNameDescs ?? [],
    loading: loading && !data,
    // errorPolicy "all": partial data with errors still renders; only fail without data.
    error: data?.amIRegistered ? null : error,
    refetch,
  };
}

/**
 * Mounted only while the account is being provisioned: polls the registration every 30 s so
 * the page moves on by itself (replaces the legacy window.location.reload). Unmounting — the
 * step changed — stops the poll.
 */
export function useRegistrationPoll() {
  useQuery(REGISTRATION, { pollInterval: 30000, fetchPolicy: "network-only", notifyOnNetworkStatusChange: false });
}

/** When the applicant's request was made (for the "Requested · date" line); null if unknown. */
export function useRequestDate(registration, enabled) {
  const { data } = useQuery(REQUEST_DATE, { skip: !enabled || !registration?.requestId });
  return data?.amIRegistered?.requestObj?.timeofrequest ?? null;
}

/** Totals for the data-hall strip. Node counts come from purchases (Cluster.members is empty). */
export function useHallStats() {
  const { data, loading, error } = useQuery(HALL_STATS);
  const stats = useMemo(() => {
    if (!data) return null;
    const nodes = {};
    for (const p of data.clusterPurchases ?? []) nodes[p.clustername] = (nodes[p.clustername] ?? 0) + (p.totalpurchased ?? 0);
    const live = (data.clusters ?? []).filter((c) => nodes[c.name] > 0);
    const cores = live.reduce((s, c) => s + nodes[c.name] * (c.nodecpucount ?? 0), 0);
    const gpus = live.reduce((s, c) => s + nodes[c.name] * (c.nodegpucount ?? 0), 0);
    const storage = (data.facilities ?? []).reduce((s, f) => s + (f.storagepurchases ?? []).reduce((t, p) => t + (p.purchased ?? 0), 0), 0);
    return [
      { label: "Clusters", value: formatInt(live.length) },
      { label: "Cores", value: formatInt(Math.round(cores)) },
      { label: "GPUs", value: formatInt(Math.round(gpus)) },
      { label: "Storage", value: formatStorage(storage) },
      { label: "Facilities", value: formatInt(data.facilities?.length ?? 0) },
    ];
  }, [data]);
  return { stats, loading: loading && !data, error: data ? null : error };
}

/** requestNewSDFAccount for the signed-in identity. Returns [submit, { loading, error }]. */
export function useRequestAccount() {
  const [mutate, state] = useMutation(REQUEST_ACCOUNT, { refetchQueries: REFETCH, awaitRefetchQueries: true });
  const submit = useCallback(
    ({ eppn, username, facility, notes }) =>
      mutate({ variables: { request: { reqtype: "UserAccount", eppn, preferredUserName: username, facilityname: facility, notes } } }),
    [mutate],
  );
  return [submit, state];
}

/** Self-completion of a pre-approved account request. */
export function useCompletePreApproved() {
  const [mutate, state] = useMutation(COMPLETE_PREAPPROVED, { refetchQueries: REFETCH, awaitRefetchQueries: true });
  const submit = useCallback((id) => mutate({ variables: { id } }), [mutate]);
  return [submit, state];
}
