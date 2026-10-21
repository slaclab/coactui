"use client";

import { useMemo } from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Chip, ColumnsMenu, CopyButton, DataTable, FacetFilter, MeterBar, meterStatus, ResetButton, SearchInput, sortHeader, STATUS_TEXT, Toolbar } from "../../kit";
import { formatInt, formatPct, formatStorage, formatStoragePair } from "../../lib/format";
import { routes } from "../../lib/routes";
import { countBy, matchesFilters } from "../cluster-usage/usage-model";

const FIELDS = ["name", "facility", "rootfolder"];
const COLUMN_LABELS = { purpose: "Purpose", rootfolder: "Root folder", inodes: "Inodes" };

export function filterStorageRows(rows, filters) {
  return rows.filter((r) => matchesFilters(r, filters, FIELDS));
}

export const STORAGE_CSV = [
  { header: "facility", value: (r) => r.facility },
  { header: "repo", value: (r) => r.name },
  { header: "purpose", value: (r) => r.purpose },
  { header: "root_folder", value: (r) => r.rootfolder },
  { header: "used_gb", value: (r) => r.used ?? "" },
  { header: "allocated_gb", value: (r) => r.gigabytes },
  { header: "pct_used", value: (r) => (r.pct == null ? "" : r.pct.toFixed(1)) },
  { header: "inodes_used", value: (r) => r.inodesUsed ?? "" },
  { header: "inodes_allocated", value: (r) => r.inodes ?? "" },
];

/** Repo allocations on one storage (Paper 49K-0): filters in the URL, sort/columns local to the table. */
export function StorageReposTable({ rows, loading, filters, storagename, purpose, showAll }) {
  const { q, setQ, facilities, setFacilities, active, reset } = filters;
  const filtered = useMemo(() => filterStorageRows(rows, { q, facilities }), [rows, q, facilities]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: sortHeader("Repo"),
        cell: ({ row: { original: r } }) => (
          <Link href={routes.storageAllocation(r.facility, r.name, r.allocationId)} className="tw:font-mono tw:text-[13px] tw:font-medium tw:text-foreground tw:no-underline tw:hover:underline">{r.name}</Link>
        ),
        enableHiding: false,
        meta: { cellClassName: "tw:pl-4", headerClassName: "tw:pl-4" },
      },
      { accessorKey: "facility", header: sortHeader("Facility"), cell: ({ getValue }) => <Chip>{getValue()}</Chip>, size: 110 },
      { accessorKey: "purpose", header: sortHeader("Purpose"), cell: ({ getValue }) => <Chip className="tw:font-medium">{getValue()}</Chip>, size: 110 },
      {
        id: "pct",
        accessorFn: (r) => r.pct ?? -1,
        header: sortHeader("Used of allocated"),
        cell: ({ row: { original: r } }) => <UsedOfAllocated row={r} />,
        enableHiding: false,
        size: 360,
      },
      {
        accessorKey: "rootfolder",
        header: "Root folder",
        cell: ({ getValue }) =>
          getValue() ? (
            <span className="tw:flex tw:items-center tw:gap-1">
              <span className="tw:truncate tw:font-mono tw:text-xs tw:text-muted-strong">{getValue()}</span>
              <CopyButton value={getValue()} label="Copy root folder" />
            </span>
          ) : (
            <span className="tw:text-muted-foreground">—</span>
          ),
      },
      {
        id: "inodes",
        accessorFn: (r) => r.inodesUsed ?? -1,
        header: sortHeader("Inodes", { align: "right" }),
        cell: ({ row: { original: r } }) => (
          <span className="tw:block tw:text-right tw:text-[13px] tw:text-muted-strong tw:tabular-nums">
            {r.inodes ? `${formatInt(r.inodesUsed ?? 0)} / ${formatInt(r.inodes)}` : "—"}
          </span>
        ),
        size: 160,
        meta: { cellClassName: "tw:pr-4", headerClassName: "tw:pr-4" },
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={filtered}
      getRowId={(r) => r.id}
      loading={loading}
      skeleton={["tw:w-36", "tw:w-12", "tw:w-12", "tw:w-60"]}
      initialSorting={[{ id: "pct", desc: true }]}
      initialColumnVisibility={{ rootfolder: false, inodes: false }}
      empty={
        rows.length === 0 ? (
          <>No current allocations on <span className="tw:font-mono">{storagename}</span>{purpose ? ` · ${purpose}` : ""}</>
        ) : (
          <>
            No repos match{q ? ` “${q}”` : " these filters"}.{" "}
            <button type="button" onClick={reset} className="tw:font-medium tw:text-foreground tw:underline">Clear filters</button>
          </>
        )
      }
      toolbar={(table) => (
        <Toolbar
          className="tw:pt-0"
          start={
            <>
              <SearchInput value={q} onChange={setQ} placeholder="Filter repos…" width="tw:w-65" />
              <FacetFilter label="Facility" options={countBy(rows, "facility")} selected={facilities} onChange={setFacilities} />
              {active ? <ResetButton onClick={reset} /> : null}
            </>
          }
          end={
            <>
              <span className="tw:text-[13px] tw:text-muted-foreground tw:tabular-nums">
                Sorted by % used · {formatInt(filtered.length)} repos{showAll ? "" : " you can see"}
              </span>
              <ColumnsMenu table={table} labels={COLUMN_LABELS} trigger={<><SlidersHorizontal className="tw:size-3.5 tw:text-muted-strong" /> View</>} />
            </>
          }
        />
      )}
    />
  );
}

function UsedOfAllocated({ row: r }) {
  if (r.pct == null) {
    return <span className="tw:text-[13px] tw:text-muted-foreground">{r.gigabytes ? `No usage reported · ${formatStorage(r.gigabytes)} allocated` : "No allocation size"}</span>;
  }
  const status = meterStatus("storage", r.pct);
  const pair = formatStoragePair(r.used, r.gigabytes);
  return (
    <div className="tw:flex tw:items-center tw:gap-2.5" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.pct)} aria-label={`${r.name} storage ${pair} used`}>
      <MeterBar pct={r.pct} status={status} className="tw:w-45 tw:shadow-[inset_0_0_0_1px_var(--border)]" />
      <span className={cn("tw:text-[13px] tw:font-medium tw:whitespace-nowrap tw:tabular-nums", STATUS_TEXT[status])}>{pair}</span>
      <span className="tw:text-xs tw:text-muted-foreground tw:tabular-nums">{formatPct(r.pct)}</span>
    </div>
  );
}
