"use client";

import { useMemo } from "react";
import Link from "next/link";
import { DataTable, sortHeader } from "../../../kit";
import { formatInt } from "../../../lib/format";
import { routes } from "../../../lib/routes";
import { ChartCard } from "../components/chart-card";
import { ShareCell } from "../components/share-cell";
import { UsageChart } from "../components/usage-chart";
import { facilityTotals, foldSeries } from "../usage-model";

const resourceH = (v) => `${(v / 1e6).toFixed(2)}M resource-h`;

export function facilityRows(model) {
  return facilityTotals(model.win, model.purchases, model.cluster);
}

export function facilityCsv(model) {
  return {
    columns: [
      { header: "facility", value: (r) => r.facility },
      { header: "purchased_nodes", value: (r) => r.nodes },
      { header: "used_resource_hours", value: (r) => Math.round(r.used) },
      { header: "capacity_resource_hours", value: (r) => Math.round(r.capacity) },
      { header: "pct_of_purchase", value: (r) => (r.pct == null ? "" : r.pct.toFixed(1)) },
      { header: "active_repos", value: (r) => r.repos },
    ],
    rows: [...facilityRows(model)].sort((a, b) => b.used - a.used),
  };
}

/** By facility (Paper 41V-0): stacked chart (top 2 + N others) and the facility table. */
export function FacilityTab({ model, clustername, mode, onMode, rangeKey, loading, error, onRetry, empty }) {
  const series = useMemo(() => (model ? foldSeries(model.win, "facility", model.perDay, { extra: model.purchases.map((p) => p.facility) }) : null), [model]);
  const rows = useMemo(() => (model ? facilityRows(model) : []), [model]);
  const busy = loading || !model;
  const span = model?.win.span ?? "…";
  const title = mode === "percent" ? `Utilization of purchased capacity · ${span}` : `${model?.win.unit ?? "Daily"} resource-hours by facility · ${span}`;

  const columns = useMemo(
    () => [
      {
        accessorKey: "facility",
        header: sortHeader("Facility"),
        cell: ({ getValue }) => (
          <Link href={routes.facility(getValue())} className="tw:text-sm tw:font-medium tw:text-foreground tw:no-underline tw:hover:underline">{getValue()}</Link>
        ),
        meta: { cellClassName: "tw:pl-4", headerClassName: "tw:pl-4" },
      },
      {
        accessorKey: "nodes",
        header: sortHeader("Purchased", { align: "right" }),
        cell: ({ getValue }) => <span className="tw:block tw:text-right tw:text-[13px] tw:text-muted-strong tw:tabular-nums">{getValue() ? `${formatInt(getValue())} ${getValue() === 1 ? "node" : "nodes"}` : "—"}</span>,
        size: 140,
      },
      {
        accessorKey: "used",
        header: sortHeader(`Used this ${rangeKey}`, { align: "right" }),
        cell: ({ getValue }) => <span className="tw:block tw:text-right tw:tabular-nums">{resourceH(getValue())}</span>,
        size: 180,
      },
      {
        id: "pct",
        accessorFn: (r) => r.pct ?? -1,
        header: sortHeader("% of purchase"),
        cell: ({ row: { original: r } }) => (
          <ShareCell wide type="compute-used" pct={r.pct} empty="No purchase" label={`${r.facility} used ${Math.round(r.pct ?? 0)}% of its ${clustername} purchase`} />
        ),
        size: 300,
        meta: { cellClassName: "tw:pl-6", headerClassName: "tw:pl-6" },
      },
      {
        accessorKey: "repos",
        header: sortHeader("Active repos", { align: "right" }),
        cell: ({ getValue }) => <span className="tw:block tw:text-right tw:text-[13px] tw:text-muted-strong tw:tabular-nums">{getValue()}</span>,
        size: 120,
        meta: { cellClassName: "tw:pr-4", headerClassName: "tw:pr-4" },
      },
    ],
    [rangeKey, clustername],
  );

  return (
    <>
      <ChartCard title={title} mode={mode} onMode={onMode} loading={busy} error={error} onRetry={onRetry} empty={empty}>
        {series && <UsageChart mode={mode} series={series} rangeKey={rangeKey} />}
      </ChartCard>
      {!error && !empty && (
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(r) => r.facility}
          loading={busy}
          skeleton={["tw:w-20", "tw:w-16 tw:ml-auto", "tw:w-28 tw:ml-auto", "tw:w-56", "tw:w-8 tw:ml-auto"]}
          initialSorting={[{ id: "used", desc: true }]}
          empty={`No facility has purchased ${clustername}.`}
          footer={false}
          defaultPageSize={100}
        />
      )}
    </>
  );
}
