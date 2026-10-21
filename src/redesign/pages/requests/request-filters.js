"use client";

import { useCallback, useMemo } from "react";
import { addDays, isoDay } from "../../lib/dates";
import { useQueryState } from "../../lib/navigation";
import { describeRequest, STATUS_META, TYPE_META, typeLabel } from "./request-meta";

/*
 * Requests filters live in the URL (spec §5 "Other tabs › Requests"). Only these keys ever
 * reach the API; anything else on the URL (tab, scope, view, q, req, dialog…) is ignored by
 * the filter builder — the legacy page turned every query param into a filter field.
 */
export const FILTER_KEYS = ["reqtype", "approvalstatus", "reponame", "facilityname", "windowbegin", "windowend", "foruser"];

export const WINDOWS = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "1y", label: "Last year", days: 365 },
  { value: "any", label: "Any time", days: null },
];
// All has no "Any time": unbounded it is tens of thousands of rows and requests() has no limit.
export const windowsFor = (view) => (view === "all" ? WINDOWS.filter((w) => w.days) : WINDOWS);
const DEFAULT_WINDOW = { all: "30d", mine: "any", pending: "any" };

const list = (raw) => (raw ? raw.split(",").filter(Boolean) : []);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const validIso = (s) => !!s && !Number.isNaN(Date.parse(s));

/**
 * Reads the whitelisted filters (+ q and window) from the URL and derives:
 *   apiFilter    CoactRequestFilter for the All view (always with a paired window)
 *   matches(row) the same filters client-side (Pending/Mine are fetched unfiltered; on All
 *                it also applies the multi-value facets the single-valued API can't express)
 * `fixed` (e.g. { facilityname: "LCLS" } in the facility tab) overrides the URL.
 * No state of its own: everything is computed from the URL each render.
 */
export function useRequestFilters({ view, fixed = {} }) {
  const [params, setParams] = useQueryState();
  const get = (k) => fixed[k] ?? params.get(k) ?? "";

  const q = params.get("q") ?? "";
  const reqtypes = list(get("reqtype"));
  const facilities = fixed.facilityname ? [fixed.facilityname] : list(params.get("facilityname"));
  // Enum values from the URL are checked before they reach the API: an unknown value would
  // fail the whole query with a GraphQL validation error instead of just matching nothing.
  const rawStatus = view === "pending" ? "" : get("approvalstatus");
  const approvalstatus = STATUS_META[rawStatus] ? rawStatus : "";
  const reponame = get("reponame");
  const foruser = get("foruser");
  const explicitBegin = params.get("windowbegin");
  const explicitEnd = params.get("windowend");
  const hasExplicit = validIso(explicitBegin) && validIso(explicitEnd);
  const windows = windowsFor(view);
  const requestedWindow = params.get("window");
  const windowKey = hasExplicit ? "custom" : windows.some((w) => w.value === requestedWindow) ? requestedWindow : DEFAULT_WINDOW[view];
  const today = isoDay(Date.now()); // stable within a UTC day, so the variables don't churn

  const range = useMemo(() => {
    if (view === "pending") return null;
    if (hasExplicit) return { begin: new Date(explicitBegin).toISOString(), end: new Date(explicitEnd).toISOString() };
    const w = WINDOWS.find((x) => x.value === windowKey);
    if (!w?.days) return null;
    return { begin: `${addDays(today, -w.days)}T00:00:00.000Z`, end: `${addDays(today, 1)}T00:00:00.000Z` };
  }, [view, hasExplicit, explicitBegin, explicitEnd, windowKey, today]);

  const reqtypeKey = reqtypes.join(",");
  const facilityKey = facilities.join(",");
  const apiFilter = useMemo(() => {
    if (view !== "all") return undefined;
    const f = {};
    if (reqtypes.length === 1 && TYPE_META[reqtypes[0]]) f.reqtype = reqtypes[0];
    if (approvalstatus) f.approvalstatus = approvalstatus;
    if (facilities.length === 1) f.facilityname = facilities[0];
    // reponame/foruser are Mongo regexes server-side; URL values are literal names.
    if (reponame) f.reponame = `^${escapeRegex(reponame)}$`;
    if (foruser) f.foruser = `^${escapeRegex(foruser)}$`;
    // The API drops the window unless both ends are present.
    if (range) Object.assign(f, { windowbegin: range.begin, windowend: range.end });
    return f;
    // reqtypes/facilities are keyed by their joined strings
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, reqtypeKey, approvalstatus, facilityKey, reponame, foruser, range]);

  const matches = useCallback(
    (r) => {
      if (reqtypes.length && !reqtypes.includes(r.reqtype)) return false;
      if (facilities.length && !facilities.includes(r.facilityname)) return false;
      if (approvalstatus && r.approvalstatus !== approvalstatus) return false;
      if (reponame && r.reponame !== reponame) return false;
      if (foruser && r.username !== foruser && r.preferredUserName !== foruser) return false;
      if (range && (r.timeofrequest < range.begin || r.timeofrequest >= range.end)) return false;
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reqtypeKey, facilityKey, approvalstatus, reponame, foruser, range],
  );

  const set = useCallback(
    (changes) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(changes)) {
        if (v == null || v === "" || (Array.isArray(v) && !v.length)) next.delete(k);
        else next.set(k, Array.isArray(v) ? v.join(",") : v);
      }
      setParams(next);
    },
    [params, setParams],
  );

  const active = !!(q || reqtypes.length || (!fixed.facilityname && facilities.length) || approvalstatus || reponame || foruser || hasExplicit || (requestedWindow && requestedWindow !== DEFAULT_WINDOW[view]));
  const reset = useCallback(
    () => set({ q: null, reqtype: null, approvalstatus: null, reponame: null, foruser: null, windowbegin: null, windowend: null, window: null, ...(fixed.facilityname ? {} : { facilityname: null }) }),
    [set, fixed.facilityname],
  );

  return {
    q, reqtypes, facilities, approvalstatus, reponame, foruser,
    windowKey, windows, range, apiFilter, matches, set, reset, active,
    serverNarrowed: { reqtype: view === "all" && reqtypes.length === 1 && !!TYPE_META[reqtypes[0]], approvalstatus: view === "all" && !!approvalstatus, facilityname: view === "all" && facilities.length === 1 },
  };
}

/** Client search ?q=: type label, users, repo, facility, cluster, requester, description. */
export function searchMatch(r, needle) {
  if (!needle) return true;
  const n = needle.toLowerCase();
  return [typeLabel(r.reqtype), r.username, r.preferredUserName, r.eppn, r.reponame, r.previousName, r.facilityname, r.clustername, r.storagename, r.requestedby, describeRequest(r).text]
    .some((s) => s && String(s).toLowerCase().includes(n));
}
