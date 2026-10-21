"use client";

import { useCallback } from "react";
import { useQueryList, useQueryParam, useQueryState } from "../../lib/navigation";
import { DEFAULT_MODE, DEFAULT_RANGE, DEFAULT_TAB, MODE_VALUES, RANGE_VALUES, SOURCE_VALUES, TAB_VALUES } from "./constants";

/** A query param restricted to `values`; anything else reads as `fallback` (kept out of the URL). */
function useEnumParam(key, values, fallback) {
  const [raw, set] = useQueryParam(key, fallback);
  return [values.includes(raw) ? raw : fallback, set];
}

/**
 * View state for /clusterusage, all in the URL: ?tab, ?range, ?chart, ?source.
 * ?chart is shared across tabs with a per-tab default (Overall → percent, others → bar); an
 * explicit ?chart survives tab switches, the default never enters the URL.
 * `canSeeUsers` gates the By user tab: a disallowed ?tab=user reads as the default tab.
 */
export function useUsageView({ canSeeUsers = true } = {}) {
  const [requestedTab, setTab] = useEnumParam("tab", TAB_VALUES, DEFAULT_TAB);
  const tab = requestedTab === "user" && !canSeeUsers ? DEFAULT_TAB : requestedTab;
  const [rangeKey, setRange] = useEnumParam("range", RANGE_VALUES, DEFAULT_RANGE);
  const [mode, setMode] = useEnumParam("chart", MODE_VALUES, DEFAULT_MODE[tab]);
  const [source, setSource] = useEnumParam("source", SOURCE_VALUES, "rollup");
  return { tab, setTab, rangeKey, setRange, mode, setMode, source, setSource };
}

/** ?q + ?facility filters for the usage tables (one hook, so the page's CSV export sees them too). */
export function useUsageFilters() {
  const [params, setParams] = useQueryState();
  const [q, setQ] = useQueryParam("q", "");
  const [facilities, setFacilities] = useQueryList("facility");
  // One URL write for both keys (two setters in a row would each start from the same params).
  const reset = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete("q");
    next.delete("facility");
    setParams(next);
  }, [params, setParams]);
  return { q, setQ, facilities, setFacilities, active: !!q || facilities.length > 0, reset };
}
