// Facility health rule (spec §2 "Health rule"): the worst match wins. Pure functions only,
// shared by the card badge, the table column, the Health facet, the sort and the subtitle.
// Thresholds are evaluated on the displayed (rounded) value, like kit meterStatus.

import { formatPct } from "../../lib/format";

/** key → label / tone / order (worst first). Paper v2 labels the spec's "Warning" as "Watch". */
export const HEALTH = {
  crit: { key: "crit", label: "Critical", tone: "crit", order: 0 },
  burst: { key: "burst", label: "Bursting", tone: "burst", order: 1 },
  warn: { key: "warn", label: "Watch", tone: "warn", order: 2 },
  idle: { key: "idle", label: "Idle", tone: "neutral", order: 3 },
  ok: { key: "ok", label: "Healthy", tone: "ok", order: 4 },
};
export const HEALTH_KEYS = ["crit", "burst", "warn", "idle", "ok"];
/** Statuses counted as "need attention" in the page subtitle. */
export const ATTENTION = ["crit", "burst", "warn", "idle"];

const RULES = {
  computeAllocated: "Rule: compute allocated > 100% on any cluster",
  storageOver: "Rule: storage allocated > storage purchased",
  storageFull: "Rule: storage used ≥ 95%",
  burst: "Rule: past-hour compute used > 100% of purchase on any cluster",
  storageWatch: "Rule: storage used ≥ 80%",
  idle: "Rule: every cluster's 7d used < 10% while purchases exist",
  ok: "No rule fired: allocations within purchases, storage under 80%",
};

const shown = (v) => Math.round(v);

/**
 * row = { name, compute: [{ cluster, allocatedPct, pct (7d used | null), hourPct (| null) }],
 *         storage: { purchasedGb, allocatedGb, usedGb } | null }
 * → { key, tone, label, reasons: [{ text, rule, metric? }] } (reasons of the winning level).
 * `metric` = { label, pct, type, burst } for the Popover's meter.
 */
export function facilityHealth(row) {
  const found = { crit: [], burst: [], warn: [], idle: [] };
  const st = row.storage;
  const storagePct = st && st.purchasedGb > 0 ? (st.usedGb / st.purchasedGb) * 100 : null;

  for (const c of row.compute) {
    if (shown(c.allocatedPct) > 100) {
      found.crit.push({
        text: `${c.cluster} is allocated ${formatPct(c.allocatedPct)} of purchase — repo shares exceed what ${row.name} bought.`,
        rule: RULES.computeAllocated,
        metric: { label: `${c.cluster} allocated`, pct: c.allocatedPct, type: "compute-allocated" },
      });
    }
  }
  const storageAllocPct = st && st.purchasedGb > 0 ? (st.allocatedGb / st.purchasedGb) * 100 : null;
  if (st && (storageAllocPct != null ? shown(storageAllocPct) > 100 : st.allocatedGb > 0)) {
    const pct = storageAllocPct;
    found.crit.push({
      text: "Storage allocated to repos is more than the facility purchased.",
      rule: RULES.storageOver,
      metric: pct != null ? { label: "storage allocated", pct, type: "compute-allocated" } : undefined,
    });
  }
  if (storagePct != null && shown(storagePct) >= 95) {
    found.crit.push({ text: `Storage ${formatPct(storagePct)} used.`, rule: RULES.storageFull, metric: { label: "storage used", pct: storagePct, type: "storage" } });
  }
  for (const c of row.compute) {
    if (c.hourPct != null && shown(c.hourPct) > 100) {
      found.burst.push({
        text: `${c.cluster} ${formatPct(c.hourPct)} of purchase, past hour.`,
        rule: RULES.burst,
        metric: { label: `${c.cluster} past hour`, pct: c.hourPct, type: "compute-used", burst: c.burstPercent ?? 0 },
      });
    }
  }
  if (storagePct != null && shown(storagePct) >= 80 && shown(storagePct) < 95) {
    found.warn.push({ text: `Storage ${formatPct(storagePct)} used.`, rule: RULES.storageWatch, metric: { label: "storage used", pct: storagePct, type: "storage" } });
  }
  const measured = row.compute.filter((c) => c.pct != null);
  if (row.compute.length > 0 && measured.length === row.compute.length && measured.every((c) => shown(c.pct) < 10)) {
    const top = [...measured].sort((a, b) => b.pct - a.pct)[0];
    found.idle.push({
      text: "All clusters < 10% over 7d.",
      rule: RULES.idle,
      metric: { label: `${top.cluster} used · 7d`, pct: top.pct, type: "compute-used", burst: top.burstPercent ?? 0 },
    });
  }

  const key = ["crit", "burst", "warn", "idle"].find((k) => found[k].length) ?? "ok";
  const reasons = key === "ok" ? [{ text: "Allocations are within purchases and storage is under 80%.", rule: RULES.ok }] : found[key];
  return { ...HEALTH[key], reasons };
}

/** { crit: 2, burst: 0, … } over rows that have a health value. */
export function healthCounts(rows) {
  const counts = Object.fromEntries(HEALTH_KEYS.map((k) => [k, 0]));
  for (const r of rows) if (r.health) counts[r.health.key] += 1;
  return counts;
}
