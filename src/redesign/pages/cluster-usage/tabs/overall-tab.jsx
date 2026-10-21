"use client";

import { useMemo } from "react";
import { fmtLongDay, fmtMonth } from "../../../lib/dates";
import { formatPct, formatResourceHours } from "../../../lib/format";
import { ChartCard } from "../components/chart-card";
import { StatRow, StatTile } from "../components/stat-tile";
import { UsageChart } from "../components/usage-chart";
import { foldSeries, overallStats } from "../usage-model";

/** Cluster-wide series (one "Total"), computed client-side from the ByDay/Month rollup. */
export function overallSeries(model) {
  return foldSeries(model.win, "total", model.perDay);
}

export function overallCsv(model) {
  const s = overallSeries(model);
  return {
    columns: [
      { header: "date", value: (r) => r.date },
      { header: "resource_hours", value: (r) => r.total },
      { header: "capacity_resource_hours", value: (r) => r.capacity },
      { header: "utilization_pct", value: (r) => r.utilization },
    ],
    rows: s.rows,
  };
}

/** Overall: KPI row + utilization (default) or total-usage chart against capacity. */
export function OverallTab({ model, mode, onMode, rangeKey, loading, error, onRetry, empty }) {
  const series = useMemo(() => (model ? overallSeries(model) : null), [model]);
  const stats = useMemo(() => (model && series ? overallStats(model.win, series) : null), [model, series]);
  const busy = loading || !model;
  const span = model?.win.span ?? "…";
  const per = rangeKey === "year" ? "month" : "day";
  const title = mode === "percent" ? `Cluster utilization of purchased capacity · ${span}` : `${model?.win.unit ?? "Daily"} resource-hours, all facilities · ${span}`;
  const hideKpis = error || empty;

  return (
    <>
      {!hideKpis && (
        <StatRow>
          <StatTile loading={busy} label="Avg utilization" value={stats && formatPct(stats.avg)} caption={`Mean per ${per} of purchased capacity`} />
          <StatTile
            loading={busy}
            label={`Peak ${per}`}
            value={stats && formatPct(stats.peak)}
            caption={stats?.peakDate ? `on ${(rangeKey === "year" ? fmtMonth : fmtLongDay)(stats.peakDate)}` : "—"}
          />
          <StatTile loading={busy} label="Total in range" value={stats && formatResourceHours(stats.used)} caption={model ? `of ${formatResourceHours(model.perDay * model.win.dayCount)} capacity` : "—"} />
          <StatTile loading={busy} label="Active facilities · repos" value={stats && `${stats.facilities} · ${stats.repos}`} caption="With usage in this range" />
        </StatRow>
      )}
      <ChartCard title={title} mode={mode} onMode={onMode} loading={busy} error={error} onRetry={onRetry} empty={empty}>
        {series && <UsageChart mode={mode} series={series} rangeKey={rangeKey} />}
      </ChartCard>
    </>
  );
}
