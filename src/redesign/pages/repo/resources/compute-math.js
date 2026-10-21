// Pure derivations for the repo Compute tab and the compute allocation detail page.
// No React here: everything is computed from API rows so components only render.
import { formatInt, sig3 } from "../../../lib/format";

const HOUR = 3600000;
const DAY = 86400000;

export const JOB_WINDOWS = [
  { value: "5", label: "5m", minutes: 5 },
  { value: "15", label: "15m", minutes: 15 },
  { value: "60", label: "1h", minutes: 60 },
  { value: "180", label: "3h", minutes: 180 },
];
export const DEFAULT_JOB_WINDOW = "60";
export const jobWindow = (raw) => JOB_WINDOWS.find((w) => w.value === raw) ?? JOB_WINDOWS.find((w) => w.value === DEFAULT_JOB_WINDOW);

/** Usage windows on the stat row (repoRecentComputeUsage aliases in queries.js). */
export const USAGE_WINDOWS = [
  { key: "pastHour", label: "Past hour" },
  { key: "pastDay", label: "24h" },
  { key: "pastWeek", label: "7d" },
  { key: "pastMonth", label: "30d" },
];

/** Facility purchase (nodes) on a cluster; 0 when the facility bought nothing there. */
export function purchasedOn(facilityObj, clustername) {
  return (facilityObj?.computepurchases ?? []).find((p) => p.clustername === clustername)?.purchased ?? 0;
}

/** Allocated nodes: the stored absolute value, else purchased × % (legacy fallback). */
export function allocatedNodes(alloc, purchased) {
  if (alloc?.allocated) return alloc.allocated;
  return purchased && alloc?.percentOfFacility ? (purchased * alloc.percentOfFacility) / 100 : 0;
}

export function burstNodes(alloc, purchased) {
  if (alloc?.burstAllocated) return alloc.burstAllocated;
  return purchased && alloc?.burstPercentOfFacility ? (purchased * alloc.burstPercentOfFacility) / 100 : 0;
}

export const lifetimeUsage = (alloc) => (alloc?.usage ?? []).reduce((t, u) => t + (u.resourceHours ?? 0), 0);

/** Hours from the allocation start to now, capped at its end (never negative). */
export function periodHours(alloc, now = Date.now()) {
  const start = Date.parse(alloc?.start);
  const end = Date.parse(alloc?.end);
  if (Number.isNaN(start)) return 0;
  const until = Number.isNaN(end) ? now : Math.min(now, end);
  return Math.max(0, (until - start) / HOUR);
}

/**
 * Everything one cluster block shows, derived from the allocation, the facility purchase and
 * the cluster's cores per node. `pct` is used ÷ (allocated nodes × cores × hours so far).
 * Burst is read as an additional share of the facility on top of the allocation, so the
 * meter's burst headroom is burst nodes ÷ allocated nodes (spec §2 open question).
 */
export function describeAllocation(alloc, facilityObj, cores, now = Date.now()) {
  const purchased = purchasedOn(facilityObj, alloc.clustername);
  const nodes = allocatedNodes(alloc, purchased);
  const burst = burstNodes(alloc, purchased);
  const coresPerNode = alloc.clusterNodeCPUCount || cores || 0;
  const used = lifetimeUsage(alloc);
  const capacity = nodes * coresPerNode * periodHours(alloc, now);
  const pct = capacity > 0 ? (used / capacity) * 100 : null;
  const burstPct = nodes > 0 ? (burst / nodes) * 100 : 0;
  return { alloc, purchased, nodes, burst, coresPerNode, used, capacity, pct, burstPct };
}

const nodesText = (n) => (Number.isInteger(n) ? formatInt(n) : sig3(n));

/** "30% of LCLS · 36 of 120 nodes · burst 10%" */
export function allocationMeta(d, facility) {
  const a = d.alloc;
  const parts = [`${sig3(a.percentOfFacility ?? 0)}% of ${facility}`];
  parts.push(d.purchased ? `${nodesText(d.nodes)} of ${nodesText(d.purchased)} nodes` : "no purchase on this cluster");
  parts.push(a.burstPercentOfFacility ? `burst ${sig3(a.burstPercentOfFacility)}%` : "no burst");
  return parts.join(" · ");
}

/** "12,340 / 29,400 resource-h" */
export const usedOfCapacity = (d) => `${formatInt(Math.round(d.used))} / ${d.capacity ? formatInt(Math.round(d.capacity)) : "—"} resource-h`;

/** Recent usage for one repo + cluster from the aliased repoRecentComputeUsage rows. */
export function windowUsage(recent, repo, clustername) {
  return Object.fromEntries(
    USAGE_WINDOWS.map(({ key }) => {
      const rows = recent?.[key];
      if (!rows) return [key, null];
      const hit = rows.find((r) => r.name === repo.name && r.facility === repo.facility && r.clustername === clustername);
      return [key, hit?.resourceHours ?? 0];
    }),
  );
}

/** Preview in the allocation dialog: "= 36 of 120 nodes · burst 12 nodes". */
export function previewNodes(purchased, pct, burst) {
  const p = Number(pct);
  const b = Number(burst);
  if (!purchased) return null;
  const nodes = Number.isFinite(p) ? (purchased * p) / 100 : null;
  const burstN = Number.isFinite(b) ? (purchased * b) / 100 : null;
  return {
    nodes,
    burstN,
    text: `= ${nodes == null ? "—" : nodesText(Number(sig3(nodes)))} of ${nodesText(purchased)} nodes · ${burstN ? `burst ${nodesText(Number(sig3(burstN)))} nodes` : "no burst"}`,
  };
}

/** Clusters the facility purchased (≥ 0, as legacy) that the repo has no allocation on. */
export function unallocatedClusters(facilityObj, allocs) {
  const have = new Set((allocs ?? []).map((a) => a.clustername));
  return (facilityObj?.computepurchases ?? [])
    .filter((p) => p.purchased >= 0 && !have.has(p.clustername))
    .map((p) => p.clustername)
    .sort();
}

/** Default expanded block: the largest allocation (by nodes). */
export function largestAllocation(described) {
  return [...described].sort((a, b) => b.nodes - a.nodes || a.alloc.clustername.localeCompare(b.alloc.clustername))[0]?.alloc.clustername ?? null;
}

/** "1h 04m", "22m", "45s". */
export function formatDuration(ms) {
  if (ms == null || Number.isNaN(ms)) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, "0")}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** Compact counts for inodes: "1.2M", "5M", "640K". */
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
export const formatCount = (v) => (v == null ? "—" : compact.format(v));

/** Resource-hours with at most one decimal below 100 ("14.2"), integers above. */
export const formatRh = (v) => (v == null ? "—" : v < 100 ? `${Math.round(v * 10) / 10}` : formatInt(Math.round(v)));

/**
 * Cumulative resource-hours per day against a uniform pace (allocated nodes × cores × 24
 * per day from the period start). Days are UTC ISO dates.
 */
export function cumulativeSeries(perDateUsage, d) {
  const days = [...(perDateUsage ?? [])]
    .map((u) => ({ date: u.date.slice(0, 10), rh: u.resourceHours ?? 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const start = Date.parse(d.alloc.start);
  const perDay = d.nodes * d.coresPerNode * 24;
  let total = 0;
  return days.map(({ date, rh }) => {
    total += rh;
    const elapsed = Number.isNaN(start) ? 0 : Math.max(0, (Date.parse(`${date}T23:59:59Z`) - start) / DAY);
    return { date, daily: Math.round(rh * 10) / 10, used: Math.round(total), pace: Math.round(perDay * elapsed) };
  });
}

export const RANGES = [
  { value: "all", label: "All" },
  { value: "90d", label: "90d", days: 90 },
  { value: "30d", label: "30d", days: 30 },
];

/** Keep the last N days ending at the last data day (cumulative values stay from the start). */
export function windowSeries(rows, rangeKey) {
  const range = RANGES.find((r) => r.value === rangeKey);
  if (!range?.days || !rows.length) return rows;
  const last = Date.parse(`${rows.at(-1).date}T00:00:00Z`);
  const first = last - (range.days - 1) * DAY;
  return rows.filter((r) => Date.parse(`${r.date}T00:00:00Z`) >= first);
}
