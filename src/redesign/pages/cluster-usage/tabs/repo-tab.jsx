"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Chip, DataTable, FacetFilter, ResetButton, SearchInput, sortHeader, Toolbar } from "../../../kit";
import { formatInt, formatResourceHours } from "../../../lib/format";
import { routes } from "../../../lib/routes";
import { ChartCard } from "../components/chart-card";
import { ShareCell } from "../components/share-cell";
import { UsageChart } from "../components/usage-chart";
import { countBy, foldSeries, matchesFilters, repoTotals } from "../usage-model";

const FIELDS = ["repo", "facility"];

/** All repos with usage in the window, and the subset matching ?q / ?facility. */
export function repoRows(model, filters) {
  const all = repoTotals(model.win, model.purchases, model.cluster);
  return { all, filtered: all.filter((r) => matchesFilters(r, filters, FIELDS)) };
}

export function repoCsv(model, filters) {
  return {
    columns: [
      { header: "facility", value: (r) => r.facility },
      { header: "repo", value: (r) => r.repo },
      { header: "used_resource_hours", value: (r) => Math.round(r.used) },
      { header: "share_of_cluster_pct", value: (r) => r.shareCluster?.toFixed(2) ?? "" },
      { header: "share_of_facility_purchase_pct", value: (r) => r.shareFacility?.toFixed(2) ?? "" },
      { header: "active_days", value: (r) => r.activeDays },
    ],
    rows: [...repoRows(model, filters).filtered].sort((a, b) => b.used - a.used),
  };
}

/** By repo: chart folded by repo (top 2 + N others) for the filtered rows, then the repo table. */
export function RepoTab({ model, clustername, mode, onMode, rangeKey, loading, error, onRetry, empty, filters }) {
  const { q, setQ, facilities, setFacilities, active, reset } = filters;
  const { all, filtered } = useMemo(() => (model ? repoRows(model, { q, facilities }) : { all: [], filtered: [] }), [model, q, facilities]);
  // The chart follows the table's filters, so both always describe the same repos.
  const series = useMemo(() => {
    if (!model) return null;
    const rows = active ? model.win.rows.filter((u) => matchesFilters(u, { q, facilities }, FIELDS)) : model.win.rows;
    return foldSeries({ ...model.win, rows }, "repo", model.perDay);
  }, [model, active, q, facilities]);
  const busy = loading || !model;
  const span = model?.win.span ?? "…";
  const title = mode === "percent" ? `Utilization of purchased capacity · ${span}` : `${model?.win.unit ?? "Daily"} resource-hours by repo · ${span}`;
  const daysLabel = rangeKey === "year" ? "Active months" : "Active days";

  const columns = useMemo(
    () => [
      {
        accessorKey: "repo",
        header: sortHeader("Repo"),
        cell: ({ row: { original: r } }) => (
          <Link href={routes.repo(r.facility, r.repo, "compute")} className="tw:font-mono tw:text-sm tw:font-medium tw:text-foreground tw:no-underline tw:hover:underline">{r.repo}</Link>
        ),
        enableHiding: false,
        meta: { cellClassName: "tw:pl-4", headerClassName: "tw:pl-4" },
      },
      { accessorKey: "facility", header: sortHeader("Facility"), cell: ({ getValue }) => <Chip>{getValue()}</Chip>, size: 110 },
      {
        accessorKey: "used",
        header: sortHeader("Used", { align: "right" }),
        cell: ({ getValue }) => <span className="tw:block tw:text-right tw:tabular-nums">{formatResourceHours(getValue())}</span>,
        size: 150,
      },
      {
        id: "shareCluster",
        accessorFn: (r) => r.shareCluster ?? -1,
        header: sortHeader("Share of cluster"),
        cell: ({ row: { original: r } }) => <ShareCell pct={r.shareCluster} label={`${r.repo} used ${Math.round(r.shareCluster ?? 0)}% of ${clustername} capacity`} />,
        size: 190,
        meta: { cellClassName: "tw:pl-6", headerClassName: "tw:pl-6" },
      },
      {
        id: "shareFacility",
        accessorFn: (r) => r.shareFacility ?? -1,
        header: sortHeader("Share of facility purchase"),
        cell: ({ row: { original: r } }) => (
          <ShareCell type="compute-used" pct={r.shareFacility} empty="No purchase" label={`${r.repo} used ${Math.round(r.shareFacility ?? 0)}% of the ${r.facility} purchase`} />
        ),
        size: 220,
      },
      {
        accessorKey: "activeDays",
        header: sortHeader(daysLabel, { align: "right" }),
        cell: ({ getValue }) => <span className="tw:block tw:text-right tw:text-[13px] tw:text-muted-strong tw:tabular-nums">{formatInt(getValue())}</span>,
        size: 120,
        meta: { cellClassName: "tw:pr-4", headerClassName: "tw:pr-4" },
      },
    ],
    [clustername, daysLabel],
  );

  return (
    <>
      <ChartCard title={title} mode={mode} onMode={onMode} loading={busy} error={error} onRetry={onRetry} empty={empty}>
        {series && <UsageChart mode={mode} series={series} rangeKey={rangeKey} mono />}
      </ChartCard>
      {!error && !empty && (
        <DataTable
          columns={columns}
          data={filtered}
          getRowId={(r) => r.id}
          loading={busy}
          skeleton={["tw:w-36", "tw:w-12", "tw:w-24 tw:ml-auto", "tw:w-32", "tw:w-32", "tw:w-8 tw:ml-auto"]}
          initialSorting={[{ id: "used", desc: true }]}
          empty={
            all.length === 0 ? (
              `No repo used ${clustername} in this range.`
            ) : (
              <>
                No repos match{q ? ` “${q}”` : " these filters"}.{" "}
                <button type="button" onClick={reset} className="tw:font-medium tw:text-foreground tw:underline">Clear filters</button>
              </>
            )
          }
          toolbar={
            <Toolbar
              className="tw:pt-0"
              start={
                <>
                  <SearchInput value={q} onChange={setQ} placeholder="Filter repos…" />
                  <FacetFilter label="Facility" options={countBy(all, "facility")} selected={facilities} onChange={setFacilities} />
                  {active ? <ResetButton onClick={reset} /> : null}
                </>
              }
              end={<span className="tw:text-[13px] tw:text-muted-foreground tw:tabular-nums">Sorted by usage · {formatInt(filtered.length)} repos</span>}
            />
          }
        />
      )}
    </>
  );
}
