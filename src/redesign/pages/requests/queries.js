"use client";

import { useCallback, useMemo } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { useViewer } from "../../providers/viewer";
import { describeRequest, needsViewer, typeLabel } from "./request-meta";

const REQUEST_FIELDS = `
  Id reqtype requestedby timeofrequest eppn username preferredUserName reponame facilityname
  principal allocationid clustername storagename purpose previousName percentOfFacility
  burstPercentOfFacility allocated burstAllocated gigabytes inodes start end shell publichtml
  computerequirement chargefactor notes approvalstatus canapprove canrefire
  audit { actedat actedby notes previous }
`;

// One document for every list: Pending (fetchprocessed:false), Mine (showmine:true — the
// resolver returns every status) and All (fetchprocessed:true + a window). Mutations refetch
// it by name, together with the shell's nav badge.
export const REQUESTS_LIST = gql`
  query RequestsList($fetchprocessed: Boolean, $showmine: Boolean, $filter: CoactRequestFilter) {
    requests(fetchprocessed: $fetchprocessed, showmine: $showmine, filter: $filter) { ${REQUEST_FIELDS} }
  }
`;

const REQUESTS_META = gql`
  query RequestsMeta { requestTypes requestStatuses facilityNames }
`;

const REVIEW_CONTEXT = gql`
  query RequestReviewContext($repo: RepoInput!, $facility: FacilityInput!) {
    repo(filter: $repo) {
      name facility principal leaders users
      currentComputeAllocations { clustername percentOfFacility burstPercentOfFacility allocated burstAllocated }
      currentStorageAllocations { storagename purpose gigabytes usage { gigabytes } }
    }
    facility(filter: $facility) {
      name czars
      computepurchases { clustername purchased allocated burstPercent }
      storagepurchases { storagename purpose purchased allocated used }
    }
  }
`;

const LOOKUP_USER = gql`
  query RequestLookupUser($username: String!) {
    usersLookupFromService(filter: { username: $username }) { username fullname preferredemail eppns uidnumber }
  }
`;

const APPROVE = gql`mutation RequestsApprove($id: String!) { requestApprove(id: $id) }`;
const REJECT = gql`mutation RequestsReject($id: String!, $notes: String!) { requestReject(id: $id, notes: $notes) }`;
const COMPLETE = gql`mutation RequestsComplete($id: String!, $notes: String!) { requestComplete(id: $id, notes: $notes) }`;
const INCOMPLETE = gql`mutation RequestsIncomplete($id: String!, $notes: String!) { requestIncomplete(id: $id, notes: $notes) }`;
const REFIRE = gql`mutation RequestsRefire($id: String!) { requestRefire(id: $id) }`;
const REOPEN = gql`mutation RequestsReopen($id: String!) { requestReopen(id: $id) }`;
const REASSIGN = gql`mutation RequestsUpdateFacility($id: String!, $newfacility: String!) { requestUpdateFacility(id: $id, newfacility: $newfacility) }`;

// Lists plus the nav badge (always mounted). On facility pages the layout's tab count
// (FacilityPendingRequests, owned by the facility group) is active too; elsewhere naming it
// would only make Apollo warn about an unknown query.
export const REFETCH = ["RequestsList", "ShellNavBadges"];
const refetchFor = (pathname) => (pathname?.startsWith("/facilities/") ? [...REFETCH, "FacilityPendingRequests"] : REFETCH);

const VARIABLES = {
  pending: () => ({ fetchprocessed: false, showmine: false }),
  mine: () => ({ showmine: true }),
  all: (filter) => ({ fetchprocessed: true, showmine: false, filter }),
};

/** Rows for a view. Pending and Mine are small and fetched unfiltered (filters apply client-side). */
export function useRequests(view, apiFilter) {
  const { viewer } = useViewer();
  // All without a window would be every request ever made; never send it.
  const ready = view !== "all" || !!apiFilter?.windowbegin;
  const { data, loading, error, refetch } = useQuery(REQUESTS_LIST, {
    skip: !viewer || !ready,
    variables: VARIABLES[view](apiFilter),
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });
  const all = data?.requests;
  const rows = useMemo(() => {
    const list = (all ?? []).filter(Boolean);
    // A leader's pending result also holds their own requests (canapprove=false).
    return view === "pending" ? list.filter(needsViewer) : list;
  }, [all, view]);
  return { rows, loading: !all && (loading || !viewer), error, refetch };
}

/** Pending rows the viewer can act on (shared by the tab badge and the Pending view). */
export const usePendingRequests = () => useRequests("pending");

export function useRequestsMeta() {
  const { data } = useQuery(REQUESTS_META, { fetchPolicy: "cache-first" });
  return {
    types: data?.requestTypes ?? [],
    statuses: data?.requestStatuses ?? [],
    facilityNames: data?.facilityNames ?? [],
  };
}

// Types whose review card needs the repo's current allocations / members.
const REPO_SCOPED = new Set(["RepoComputeAllocation", "RepoStorageAllocation", "RepoMembership", "RepoRemoveUser", "RepoChangeComputeRequirement", "RepoUpdateFeature"]);

/** Current allocations + facility purchases for the open request (cached across header/card). */
export function useRequestContext(req) {
  const skip = !req || !REPO_SCOPED.has(req.reqtype) || !req.reponame || !req.facilityname;
  const { data, loading, error, refetch } = useQuery(REVIEW_CONTEXT, {
    skip,
    variables: skip ? undefined : { repo: { name: req.reponame, facility: req.facilityname }, facility: { name: req.facilityname } },
    fetchPolicy: "cache-first",
  });
  return { repo: data?.repo ?? null, facility: data?.facility ?? null, loading: !skip && loading, error: skip ? null : error, refetch, skipped: skip };
}

/** usersLookupFromService for a UserAccount request's preferred username. */
export function useRequesterLookup(req) {
  const username = req?.reqtype === "UserAccount" ? req.preferredUserName : null;
  const { data, loading, error, refetch } = useQuery(LOOKUP_USER, { skip: !username, variables: { username: username ?? "" }, fetchPolicy: "cache-first" });
  const user = data?.usersLookupFromService?.[0] ?? null;
  return { enabled: !!username, user, found: !!user, hasUid: !!user?.uidnumber, loading: !!username && loading, error, refetch };
}

/** Every request mutation, refetching the lists and the nav badge by operation name. */
export function useRequestMutations() {
  const pathname = usePathname();
  const opts = { refetchQueries: refetchFor(pathname) };
  const [approveM] = useMutation(APPROVE, opts);
  const [rejectM] = useMutation(REJECT, opts);
  const [completeM] = useMutation(COMPLETE, opts);
  const [incompleteM] = useMutation(INCOMPLETE, opts);
  const [refireM] = useMutation(REFIRE, opts);
  const [reopenM] = useMutation(REOPEN, opts);
  const [reassignM] = useMutation(REASSIGN, opts);

  const call = (fn) => async (variables) => {
    const res = await fn({ variables });
    if (res?.errors?.length) throw new Error(res.errors[0].message);
    return res;
  };
  const approve = useCallback((req) => call(approveM)({ id: req.Id }), [approveM]);
  return {
    approve,
    /** Approve with a toast that names exactly what was approved (inline approve has no undo). */
    approveWithToast: (req) => {
      const run = approve(req);
      toast.promise(run, {
        loading: "Approving…",
        success: `Approved ${typeLabel(req.reqtype).toLowerCase()} for ${describeRequest(req).text}`,
        error: (err) => err.message,
      });
      return run;
    },
    reject: (req, notes) => call(rejectM)({ id: req.Id, notes }),
    complete: (req, notes) => call(completeM)({ id: req.Id, notes }),
    incomplete: (req, notes) => call(incompleteM)({ id: req.Id, notes }),
    refire: (req) => call(refireM)({ id: req.Id }),
    reopen: (req) => call(reopenM)({ id: req.Id }),
    reassign: (req, newfacility) => call(reassignM)({ id: req.Id, newfacility }),
  };
}
