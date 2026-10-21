// Pure usage math for /clusterusage (no React): window the rollup on its anchor day, fold it
// into chart series, and total it per facility / repo / user. Every tab derives from these.
import { addDays, daysInMonth, fmtMonth, fmtShortDay, rangeOf } from "../../lib/dates";
import { RANGES, SERIES_COLORS } from "./constants";

const monthAdd = (ym, n) => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 7);
const sum = (rows, f = (r) => r.rh) => rows.reduce((t, r) => t + (f(r) ?? 0), 0);

/** Cluster capacity per day in resource-hours (purchased nodes × cores × 24). */
export const capacityPerDay = (cluster) => (cluster ? cluster.purchasedNodes * cluster.nodecpucount * 24 : 0);

/**
 * The range window, anchored on the last rollup day: Week/Month are the dense days ending at
 * the anchor; Year is the 12 full months before the anchor's month (from the Month rollup).
 * Returns { buckets: [{ date, days }], rows: [{ facility, repo, date, rh }], dayCount, span,
 * first, last, reportRange, unit } or null until the anchor is known.
 */
export function usageWindow({ anchor, rangeKey, daily = [], monthly = [] }) {
  if (!anchor) return null;
  const range = RANGES.find((r) => r.value === rangeKey) ?? RANGES[1];
  let buckets, rows, first, last;
  if (range.value === "year") {
    const months = Array.from({ length: 12 }, (_, i) => monthAdd(anchor.slice(0, 7), i - 12));
    const inRange = new Set(months);
    buckets = months.map((m) => ({ date: `${m}-01`, days: daysInMonth(m) }));
    rows = monthly.filter((u) => inRange.has(u.month)).map((u) => ({ facility: u.facility, repo: u.repo, date: `${u.month}-01`, rh: u.rh }));
    first = buckets[0].date;
    last = `${months[11]}-${String(daysInMonth(months[11])).padStart(2, "0")}`;
  } else {
    first = addDays(anchor, -(range.days - 1));
    last = anchor;
    buckets = Array.from({ length: range.days }, (_, i) => ({ date: addDays(first, i), days: 1 }));
    rows = daily.filter((u) => u.date >= first && u.date <= anchor);
  }
  const fmt = range.value === "year" ? fmtMonth : fmtShortDay;
  return {
    range,
    buckets,
    rows,
    first,
    last,
    dayCount: buckets.reduce((t, b) => t + b.days, 0),
    span: `${fmt(buckets[0].date)} – ${fmt(buckets.at(-1).date)}`,
    reportRange: rangeOf(first, last),
    unit: range.value === "year" ? "Monthly" : "Daily",
  };
}

const DIMENSIONS = {
  facility: { key: (u) => u.facility, label: (k) => k },
  repo: { key: (u) => `${u.facility}/${u.repo}`, label: (k) => k.slice(k.indexOf("/") + 1) },
  total: { key: () => "total", label: () => "Total" },
};

/**
 * Fold the window into chart rows by `dim` ("facility" | "repo" | "total"): the top `topN`
 * series by usage plus "N others" (Paper rule). Series ids are s0, s1, others so they are safe
 * as CSS variable names. `extra` adds zero-usage keys (purchasers) to the "others" count.
 * Returns { rows: [{ date, capacity, s0…, others?, total, utilization }], keys, config, peak, avg }.
 */
export function foldSeries(win, dim, perDay, { extra = [], topN = 2 } = {}) {
  const d = DIMENSIONS[dim];
  const totals = new Map(extra.map((k) => [k, 0]));
  for (const u of win.rows) totals.set(d.key(u), (totals.get(d.key(u)) ?? 0) + u.rh);
  const named =
    dim === "total"
      ? ["total"]
      : [...totals].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, topN).map(([k]) => k);
  const othersCount = dim === "total" ? 0 : totals.size - named.length;
  const idOf = new Map(named.map((k, i) => [k, `s${i}`]));
  const keys = [...idOf.values(), ...(othersCount > 0 ? ["others"] : [])];

  const byDate = new Map(win.buckets.map((b) => [b.date, {}]));
  for (const u of win.rows) {
    const bucket = byDate.get(u.date);
    if (!bucket) continue;
    const id = idOf.get(d.key(u)) ?? "others";
    bucket[id] = (bucket[id] ?? 0) + u.rh;
  }
  const rows = win.buckets.map(({ date, days }) => {
    const bucket = byDate.get(date);
    const out = { date, capacity: perDay * days, total: 0 };
    for (const id of keys) {
      out[id] = Math.round(bucket[id] ?? 0);
      out.total += out[id];
    }
    out.utilization = out.capacity ? Math.round((out.total / out.capacity) * 1000) / 10 : 0;
    return out;
  });

  const config = Object.fromEntries(
    keys.map((id, i) => [id, { label: id === "others" ? `${othersCount} others` : d.label(named[i]), color: SERIES_COLORS[i] }]),
  );
  config.utilization = { label: "Utilization", color: SERIES_COLORS[0] };
  const utils = rows.map((r) => r.utilization);
  return {
    rows,
    keys,
    config,
    peak: utils.length ? Math.max(...utils) : 0,
    avg: utils.length ? utils.reduce((t, v) => t + v, 0) / utils.length : 0,
  };
}

/** Per-facility totals: purchasers plus any facility with usage. pct = used / own purchase. */
export function facilityTotals(win, purchases, cluster) {
  const nodes = new Map(purchases.map((p) => [p.facility, p.nodes]));
  const names = [...new Set([...purchases.map((p) => p.facility), ...win.rows.map((u) => u.facility)])];
  return names.map((facility) => {
    const rows = win.rows.filter((u) => u.facility === facility);
    const n = nodes.get(facility) ?? 0;
    const capacity = n * cluster.nodecpucount * 24 * win.dayCount;
    const used = sum(rows);
    return { facility, nodes: n, used, capacity, pct: capacity ? (used / capacity) * 100 : null, repos: new Set(rows.filter((u) => u.rh > 0).map((u) => u.repo)).size };
  });
}

/** Per-repo totals with share of cluster capacity and of the facility's purchase. */
export function repoTotals(win, purchases, cluster) {
  const clusterCap = capacityPerDay(cluster) * win.dayCount;
  const facilityCap = new Map(purchases.map((p) => [p.facility, p.nodes * cluster.nodecpucount * 24 * win.dayCount]));
  const byRepo = new Map();
  for (const u of win.rows) {
    const id = `${u.facility}/${u.repo}`;
    const r = byRepo.get(id) ?? { id, facility: u.facility, repo: u.repo, used: 0, days: new Set() };
    r.used += u.rh;
    if (u.rh > 0) r.days.add(u.date);
    byRepo.set(id, r);
  }
  return [...byRepo.values()]
    .filter((r) => r.used > 0)
    .map(({ days, ...r }) => ({
      ...r,
      activeDays: days.size,
      shareCluster: clusterCap ? (r.used / clusterCap) * 100 : null,
      shareFacility: facilityCap.get(r.facility) ? (r.used / facilityCap.get(r.facility)) * 100 : null,
    }));
}

/** Per-user rows from reportFacilityComputeByUser(ToDate); share of cluster capacity over `days`. */
export function userTotals(rows, cluster, days) {
  const cap = capacityPerDay(cluster) * days;
  return rows.map((u) => ({
    id: `${u.facility}/${u.repo}/${u.username}`,
    username: u.username,
    repo: u.repo,
    facility: u.facility,
    used: u.resourceHours ?? 0,
    share: cap ? ((u.resourceHours ?? 0) / cap) * 100 : null,
  }));
}

/** Cluster-wide KPIs for the Overall tab. */
export function overallStats(win, folded) {
  const active = win.rows.filter((u) => u.rh > 0);
  return {
    used: sum(win.rows),
    avg: folded.avg,
    peak: folded.peak,
    peakDate: folded.rows.reduce((best, r) => (!best || r.utilization > best.utilization ? r : best), null)?.date ?? null,
    facilities: new Set(active.map((u) => u.facility)).size,
    repos: new Set(active.map((u) => `${u.facility}/${u.repo}`)).size,
  };
}

/** Facet + free-text filter shared by the repo/user/storage tables. */
export function matchesFilters(row, { q, facilities }, fields) {
  if (facilities.length && !facilities.includes(row.facility)) return false;
  if (!q) return true;
  const needle = q.toLowerCase();
  return fields.some((f) => String(row[f] ?? "").toLowerCase().includes(needle));
}

/** Facet options with counts: [{ value, count }] sorted by value. */
export function countBy(rows, key) {
  const m = new Map();
  for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + 1);
  return [...m].sort(([a], [b]) => String(a).localeCompare(String(b))).map(([value, count]) => ({ value, count }));
}
