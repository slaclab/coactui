// Spec §2 number formatting. Thresholds are evaluated on the displayed value.

const int = new Intl.NumberFormat("en");
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** "82%", one decimal below 10 ("4.2%"), true zero "0%", missing "—". Never "0.00%". */
export function formatPct(value) {
  if (value == null || Number.isNaN(value)) return "—";
  if (value === 0) return "0%";
  return value < 10 ? `${value.toFixed(1).replace(/\.0$/, "")}%` : `${Math.round(value)}%`;
}

/** Three significant figures. */
export const sig3 = (v) => (v == null ? "—" : `${Number(Number(v).toPrecision(3))}`);

/** Storage from gigabytes: "412 TB", "1.72 PB", "640 GB". */
export function formatStorage(gb) {
  if (gb == null) return "—";
  if (gb >= 1e6) return `${sig3(gb / 1e6)} PB`;
  if (gb >= 1e3) return `${sig3(gb / 1e3)} TB`;
  return `${sig3(gb)} GB`;
}

/** "used / allocated unit" with a shared unit picked from the allocation: "3.1 / 10 TB". */
export function formatStoragePair(usedGb, allocGb) {
  const [div, unit] = allocGb >= 1e6 ? [1e6, "PB"] : allocGb >= 1e3 ? [1e3, "TB"] : [1, "GB"];
  return `${sig3((usedGb ?? 0) / div)} / ${sig3(allocGb / div)} ${unit}`;
}

/** Compact resource-hours: "1.2M resource-h". The unit is never relabelled as core-hours. */
export const formatResourceHours = (v) => (v == null ? "—" : `${compact.format(v)} resource-h`);

export const formatInt = (v) => (v == null ? "—" : int.format(v));

/** Capacity: CPU clusters in cores, GPU clusters in GPUs. */
export function formatCapacity(nodes, cluster) {
  if (nodes == null || !cluster) return "—";
  const unit = cluster.nodegpucount ? `${int.format(Math.round(nodes * cluster.nodegpucount))} GPUs` : `${int.format(Math.round(nodes * cluster.nodecpucount))} cores`;
  return `${int.format(nodes)} nodes · ${unit}`;
}

/** API datetimes → "Oct 15, 2026" / "Oct 15, 2026 14:03". */
export function formatDate(value, { time = false } = {}) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en", {
    month: "short", day: "numeric", year: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  });
}

/** "2d", "3h", "just now" — for request ages. */
export function formatAge(value) {
  if (!value) return "—";
  const s = (Date.now() - new Date(value).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 60) return `${Math.floor(s / 86400)}d`;
  return formatDate(value);
}
