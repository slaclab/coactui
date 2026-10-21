"use client";

import { useCallback, useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { useViewer } from "../../providers/viewer";
import { auditAction, IN_FLIGHT_STATUSES, OPEN_STATUSES, requestSummary, requestType, statusVerb } from "./audit-labels";

/* ------------------------------------------------------------------------------------- *
 * Documents
 * ------------------------------------------------------------------------------------- */

const PROFILE_ME = gql`
  query ProfileMe {
    whoami {
      Id username fullname uidnumber eppns preferredemail shell publichtml
      earliestCompletedUserAccountRegistration facilities groups
      accessGroupObjs { Id name gidnumber repoid }
      storages { Id purpose gigabytes inodes storagename rootfolder usage { gigabytes inodes date } }
    }
  }
`;

// Its own query: myGids goes through the user-lookup service and may fail on its own.
const PROFILE_GIDS = gql`
  query ProfileGids {
    myGids { uidnumber primaryGid secondaryGidNumbers syncedAt }
  }
`;

const PROFILE_REPOS = gql`
  query ProfileRepos {
    myRepos { name facility principal leaders users group }
  }
`;

// fetchprocessed:false still returns Completed requests, so "open" is derived client-side.
const PROFILE_REQUESTS = gql`
  query ProfileRequests {
    requests(fetchprocessed: false, showmine: true) {
      Id reqtype approvalstatus timeofrequest requestedby username shell publichtml
      storagename purpose gigabytes notes reponame facilityname
    }
  }
`;

const AUDIT_EVENTS = gql`
  query AuditTrailEvents {
    userAuditTrails { Id type action actedby actedat details }
  }
`;

const AUDIT_REQUESTS = gql`
  query AuditTrailRequests($f: CoactRequestFilter) {
    requests(fetchprocessed: true, showmine: true, filter: $f) {
      Id reqtype approvalstatus timeofrequest requestedby shell publichtml
      storagename purpose gigabytes notes reponame facilityname
      audit { actedby actedat notes previous }
    }
  }
`;

export const REQUEST_SHELL = gql`
  mutation ProfileRequestShell($request: CoactRequestInput!) {
    requestUserChangeShell(request: $request) { Id approvalstatus shell }
  }
`;

export const REQUEST_PUBLIC_HTML = gql`
  mutation ProfileRequestPublicHtml($request: CoactRequestInput!) {
    requestUserPublicHtml(request: $request) { Id approvalstatus publichtml }
  }
`;

export const REQUEST_QUOTA = gql`
  mutation ProfileRequestQuota($request: CoactRequestInput!) {
    requestUserQuota(request: $request) { Id approvalstatus }
  }
`;

export const UPDATE_EPPNS = gql`
  mutation ProfileUpdateEppns($eppns: [String!]!) {
    userUpdateEppn(eppns: $eppns) { username eppns }
  }
`;

/** refetchQueries targets (operation names) per mutation. */
export const REFETCH = {
  request: ["ProfileRequests", "ProfileMe", "AuditTrailRequests"],
  quota: ["ProfileRequests", "AuditTrailRequests"],
  eppns: ["ProfileMe", "AppViewer", "AuditTrailEvents"],
};

/* ------------------------------------------------------------------------------------- *
 * Hooks — server data stays in Apollo; everything else is derived with useMemo.
 * ------------------------------------------------------------------------------------- */

export function useProfile() {
  const { data, loading, error, refetch } = useQuery(PROFILE_ME);
  const me = data?.whoami ?? null;
  return { me, loading: loading && !me, error: me ? null : error, refetch };
}

export function useProfileGids() {
  const { data, loading, error, refetch } = useQuery(PROFILE_GIDS);
  return { gids: data?.myGids ?? null, loading, error, refetch };
}

export function useProfileRepos() {
  const { data, loading, error, refetch } = useQuery(PROFILE_REPOS);
  const repos = useMemo(() => [...(data?.myRepos ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [data]);
  return { repos, loading: loading && !data, error: data ? null : error, refetch };
}

const newestFirst = (a, b) => String(b.timeofrequest ?? "").localeCompare(String(a.timeofrequest ?? ""));

/** One query, several consumers: Pending requests card, shell chip, storage pill, public-HTML state. */
export function useMyRequests() {
  const { data, loading, error, refetch } = useQuery(PROFILE_REQUESTS);
  const derived = useMemo(() => {
    const all = [...(data?.requests ?? [])].sort(newestFirst);
    const pending = all.filter((r) => OPEN_STATUSES.includes(r.approvalstatus));
    const inFlight = (type) => all.filter((r) => r.reqtype === type && IN_FLIGHT_STATUSES.includes(r.approvalstatus));
    const quota = inFlight("UserStorageAllocation");
    return {
      all,
      pending,
      pendingShell: inFlight("UserChangeShell")[0] ?? null,
      pendingPublicHtml: inFlight("UserPublicHtml")[0] ?? null,
      pendingQuotaFor: (storagename, purpose) => quota.find((r) => r.storagename === storagename && (!r.purpose || r.purpose === purpose)) ?? null,
    };
  }, [data]);
  return { ...derived, loading: loading && !data, error: data ? null : error, refetch };
}

/**
 * The account timeline: API audit rows merged with request lifecycle events (one "requested"
 * row per request + one row per status transition), normalised and sorted newest first.
 * Row: { id, at, label, kinds[], by, details, source }.
 */
export function useAccountEvents() {
  const { viewer, loading: viewerLoading } = useViewer();
  const events = useQuery(AUDIT_EVENTS);
  const requests = useQuery(AUDIT_REQUESTS, { skip: !viewer, variables: { f: { foruser: viewer?.username } } });

  const rows = useMemo(() => {
    const out = [];
    for (const e of events.data?.userAuditTrails ?? []) {
      const a = auditAction(e.action);
      out.push({ id: `a:${e.Id}`, at: e.actedat, label: a.label, kinds: [a.kind], by: e.actedby, details: e.details ?? "", source: "audit" });
    }
    for (const r of requests.data?.requests ?? []) {
      const t = requestType(r.reqtype);
      const kinds = t.kind === "requests" ? ["requests"] : [t.kind, "requests"];
      const summary = requestSummary(r);
      out.push({ id: `r:${r.Id}`, at: r.timeofrequest, label: `${t.noun} requested`, kinds, by: r.requestedby, details: summary, source: "request" });
      // audit[].previous is the status before each transition; the next status is the
      // following entry's `previous`, or the request's current status for the last one.
      const audit = [...(r.audit ?? [])].sort((x, y) => String(x.actedat ?? "").localeCompare(String(y.actedat ?? "")));
      audit.forEach((entry, i) => {
        const next = audit[i + 1]?.previous ?? r.approvalstatus;
        if (!next || next === entry.previous) return;
        out.push({
          id: `r:${r.Id}:${i}`,
          at: entry.actedat,
          label: `${t.noun} ${statusVerb(next)}`,
          kinds,
          by: entry.actedby,
          details: entry.notes ? `“${entry.notes}”` : summary,
          source: "request",
        });
      });
    }
    return out.sort((x, y) => String(y.at ?? "").localeCompare(String(x.at ?? "")));
  }, [events.data, requests.data]);

  const { refetch: refetchEvents } = events;
  const { refetch: refetchRequests } = requests;
  const refetch = useCallback(() => Promise.all([refetchEvents(), refetchRequests()]), [refetchEvents, refetchRequests]);

  return {
    rows,
    loading: (events.loading && !events.data) || (!requests.data && (requests.loading || viewerLoading)),
    // Each query's error is shown, the rows from the one that succeeded still render.
    error: (!events.data && events.error) || (!requests.data && requests.error) || null,
    refetch,
  };
}
