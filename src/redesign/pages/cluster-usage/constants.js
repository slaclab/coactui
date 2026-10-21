import { ChartArea, ChartColumn, ChartLine, Columns2 } from "lucide-react";

export const MODES = [
  { value: "bar", label: "Bar", icon: ChartColumn },
  { value: "line", label: "Line", icon: ChartLine },
  { value: "area", label: "Area", icon: ChartArea },
  { value: "percent", label: "% of capacity", icon: Columns2 },
];
export const MODE_VALUES = MODES.map((m) => m.value);

export const RANGES = [
  { value: "week", label: "Week", days: 7 },
  { value: "month", label: "Month", days: 30 },
  { value: "year", label: "Year", days: 365 },
];
export const RANGE_VALUES = RANGES.map((r) => r.value);
export const DEFAULT_RANGE = "month";

/** Tabs on ?tab=; "facility" is the default (Paper 41V-0) and is kept out of the URL. */
export const TABS = [
  { value: "overall", label: "Overall" },
  { value: "facility", label: "By facility" },
  { value: "repo", label: "By repo" },
  { value: "user", label: "By user" },
];
export const TAB_VALUES = TABS.map((t) => t.value);
export const DEFAULT_TAB = "facility";

/** Chart type default per tab: Overall opens on utilization, the breakdowns on stacked bars. */
export const DEFAULT_MODE = { overall: "percent", facility: "bar", repo: "bar", user: "bar" };

export const SOURCES = [
  { value: "rollup", label: "Daily rollup" },
  { value: "live", label: "Live (jobs) since last rollup" },
];
export const SOURCE_VALUES = SOURCES.map((s) => s.value);

/** Captions under the chart title and the right-hand legend note, per chart type. */
export const NOTES = {
  bar: { sub: null, note: null },
  line: { sub: "Line: compare trends without stacking", note: "Hover a day for exact values" },
  area: { sub: "Stacked area: total footprint against purchased capacity", note: "Stacked so the top edge is the cluster total" },
  percent: { sub: "One series, normalized to the purchase; above 100% is burst", note: null },
};

// Graphite ramp, darkest at the bottom of the stack. v2 shows at most two named series and
// folds the rest into "N others", so identity never depends on telling many hues apart.
export const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

/** Show the "Rollup N days behind" pill past this many days. */
export const STALE_DAYS = 2;
