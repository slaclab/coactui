"use client";

import { useCallback, useMemo } from "react";
import { needsAttention } from "../../actions/repo-actions";
import { useQueryList, useQueryParam, useQueryState, useResolveHref } from "../../lib/navigation";

/** Text the search box matches: name, PI, facility, LDAP group, description, leaders. */
export const matchesQuery = (r, needle) =>
  !needle || [r.name, r.principal, r.facility, r.group ?? "", r.description ?? "", ...(r.leaders ?? [])].some((s) => s?.toLowerCase().includes(needle));

/**
 * Shared toolbar filters for every preset (spec R3). All state is in the URL
 * (?q= ?facility= ?role= ?attn=), so switching ?view= keeps it. `rows` can be repo-level
 * (Overview) or expanded (repo × cluster / purpose); facets count distinct repos via `repoKey`.
 *
 *   const filters = useRepoFilters(rows, { attnOf: (r) => … , repoKey: (r) => r.repoId });
 *   filters.filtered · filters.countBy("facility") · filters.reset() · filters.active
 */
export function useRepoFilters(rows, { attnOf = needsAttention, repoKey = (r) => r.id } = {}) {
  const [q, setQ] = useQueryParam("q", "");
  const [facilities, setFacilities] = useQueryList("facility");
  const [roles, setRoles] = useQueryList("role");
  const [attnParam, setAttnParam] = useQueryParam("attn", "");
  const [params, setParams] = useQueryState();
  const attn = !!attnParam;
  const needle = q.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!facilities.length || facilities.includes(r.facility)) &&
          (!roles.length || roles.includes(r.role)) &&
          (!attn || attnOf(r)) &&
          matchesQuery(r, needle),
      ),
    [rows, facilities, roles, attn, attnOf, needle],
  );

  const countBy = useCallback(
    (key) => {
      const seen = new Set();
      const counts = {};
      for (const r of rows) {
        const k = `${repoKey(r)}|${key}`;
        if (seen.has(k)) continue;
        seen.add(k);
        counts[r[key]] = (counts[r[key]] ?? 0) + 1;
      }
      return Object.entries(counts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([value, count]) => ({ value, count }));
    },
    [rows, repoKey],
  );

  const attnCount = useMemo(() => new Set(rows.filter(attnOf).map(repoKey)).size, [rows, attnOf, repoKey]);

  // One URL write for all four keys (separate setters would race on the same snapshot).
  const reset = useCallback(() => {
    const next = new URLSearchParams(params);
    ["q", "facility", "role", "attn"].forEach((k) => next.delete(k));
    setParams(next);
  }, [params, setParams]);

  return {
    q,
    setQ,
    facilities,
    setFacilities,
    roles,
    setRoles,
    attn,
    setAttn: (on) => setAttnParam(on ? "1" : ""),
    attnCount,
    filtered,
    countBy,
    reset,
    active: !!(q || facilities.length || roles.length || attn),
    /** Exactly one facility facet selected: the Facility column carries no information. */
    singleFacility: facilities.length === 1,
  };
}

/** ?peek=<facility>/<name>: href for a row (keeps every other param), open and close. */
export function usePeek() {
  const [params, setParams] = useQueryState();
  const resolve = useResolveHref();
  const peek = params.get("peek") ?? "";
  const withPeek = useCallback(
    (id) => {
      const next = new URLSearchParams(params);
      if (id) next.set("peek", id);
      else next.delete("peek");
      return next;
    },
    [params],
  );
  return {
    peek,
    hrefFor: useCallback((id) => resolve(`?${withPeek(id)}`), [resolve, withPeek]),
    open: useCallback((id) => setParams(withPeek(id), { replace: !!params.get("peek") }), [setParams, withPeek, params]),
    close: useCallback(() => setParams(withPeek(null)), [setParams, withPeek]),
  };
}
