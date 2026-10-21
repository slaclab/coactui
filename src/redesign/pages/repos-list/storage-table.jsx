"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { ActionsMenu, Chip, DataTable, ErrorAlert, MeterBar, meterStatus, sortHeader, STATUS_TEXT } from "../../kit";
import { needsAttention, repoActions } from "../../actions/repo-actions";
import { formatStoragePair } from "../../lib/format";
import { routes } from "../../lib/routes";
import { useViewer } from "../../providers/viewer";
import { usePeek, useRepoFilters } from "./repo-filters";
import { RepoNameCell, ReposToolbar } from "./repos-toolbar";
import { useStorageRows } from "./queries";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const inodePair = (used, alloc) => `${compact.format(used ?? 0)} / ${compact.format(alloc)}`;

const COLUMN_LABELS = { facility: "Facility", purpose: "Purpose", storage: "Storage", used: "Used of allocated", inodes: "Files (inodes)" };

const CSV_COLUMNS = [
  { header: "facility", value: (r) => r.facility },
  { header: "repo", value: (r) => r.name },
  { header: "purpose", value: (r) => r.alloc.purpose },
  { header: "storage", value: (r) => r.alloc.storagename },
  { header: "used_gb", value: (r) => r.alloc.usedGb },
  { header: "allocated_gb", value: (r) => r.alloc.allocatedGb },
  { header: "used_inodes", value: (r) => r.alloc.usedInodes },
  { header: "allocated_inodes", value: (r) => r.alloc.inodes },
];

function UsedMeter({ pct, children, wide, label }) {
  const status = meterStatus("storage", pct);
  return (
    <div className="tw:flex tw:items-center tw:gap-2.5" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={label}>
      <MeterBar pct={pct} status={status} className={wide ? "tw:w-40" : "tw:w-24"} />
      <span className={cn("tw:text-[13px] tw:whitespace-nowrap tw:tabular-nums", status && cn("tw:font-medium", STATUS_TEXT[status]))}>{children}</span>
    </div>
  );
}

/** Storage preset (?view=storage): one row per repo × purpose (spec §6 "Storage preset"). */
export function StorageTable({ showAll, repoRows }) {
  const { can } = useViewer();
  const data = useStorageRows({ showAll, enabled: true });
  const peek = usePeek();
  const attnIds = useMemo(() => new Set(repoRows.filter(needsAttention).map((r) => r.id)), [repoRows]);
  const attnOf = useCallback((r) => attnIds.has(r.repoId), [attnIds]);
  const repoKey = useCallback((r) => r.repoId, []);
  const filters = useRepoFilters(data.rows, { attnOf, repoKey });
  const noFacility = filters.singleFacility;

  const columns = useMemo(
    () =>
      [
        {
          accessorKey: "name",
          header: sortHeader("Repo"),
          cell: ({ row: { original: r } }) => <RepoNameCell row={r} href={peek.hrefFor(r.repoId)} muted={!r.first} />,
          enableHiding: false,
          meta: { cellClassName: "tw:min-w-52" },
        },
        !noFacility && { accessorKey: "facility", header: "Facility", cell: ({ row: { original: r } }) => (r.first ? <Chip>{r.facility}</Chip> : null), size: 96 },
        { id: "purpose", accessorFn: (r) => r.alloc.purpose ?? "", header: sortHeader("Purpose"), cell: ({ getValue }) => <Chip>{getValue() || "—"}</Chip>, size: 110 },
        {
          id: "storage",
          accessorFn: (r) => r.alloc.storagename ?? "",
          header: "Storage",
          cell: ({ row: { original: r } }) => (
            <Link href={routes.storageAllocation(r.facility, r.name, r.alloc.id)} title={r.alloc.rootfolder} className="tw:font-mono tw:text-[13px] tw:text-foreground tw:no-underline tw:hover:underline">
              {r.alloc.storagename}
            </Link>
          ),
          size: 130,
        },
        {
          id: "used",
          accessorFn: (r) => (r.alloc.allocatedGb ? r.alloc.usedGb / r.alloc.allocatedGb : -1),
          header: sortHeader("Used of allocated"),
          cell: ({ row: { original: r } }) =>
            r.alloc.allocatedGb > 0 ? (
              <UsedMeter wide pct={(r.alloc.usedGb / r.alloc.allocatedGb) * 100} label={`${r.name} ${r.alloc.purpose} storage ${formatStoragePair(r.alloc.usedGb, r.alloc.allocatedGb)} used`}>
                {formatStoragePair(r.alloc.usedGb, r.alloc.allocatedGb)}
              </UsedMeter>
            ) : (
              <span className="tw:text-[13px] tw:text-muted-foreground">No allocation</span>
            ),
          size: 320,
        },
        {
          id: "inodes",
          accessorFn: (r) => (r.alloc.inodes ? r.alloc.usedInodes / r.alloc.inodes : -1),
          header: sortHeader("Files (inodes)"),
          cell: ({ row: { original: r } }) =>
            r.alloc.inodes > 0 ? (
              <UsedMeter pct={(r.alloc.usedInodes / r.alloc.inodes) * 100} label={`${r.name} ${r.alloc.purpose} files ${inodePair(r.alloc.usedInodes, r.alloc.inodes)}`}>
                {inodePair(r.alloc.usedInodes, r.alloc.inodes)}
              </UsedMeter>
            ) : (
              <span className="tw:text-[13px] tw:text-muted-foreground">—</span>
            ),
          size: 240,
        },
        {
          id: "actions",
          header: () => <span className="tw:sr-only">Actions</span>,
          cell: ({ row: { original: r } }) => <ActionsMenu groups={repoActions(r.repo, can, { peekHref: peek.hrefFor(r.repoId) })} label={`Actions for ${r.name}`} />,
          enableSorting: false,
          enableHiding: false,
          size: 48,
          meta: { cellClassName: "tw:px-0 tw:w-12", headerClassName: "tw:w-12" },
        },
      ].filter(Boolean),
    [can, peek.hrefFor, noFacility],
  );

  return (
    <DataTable
      columns={columns}
      data={filters.filtered}
      getRowId={(r) => r.rowId}
      loading={data.loading}
      skeleton={["tw:w-40", !noFacility && "tw:w-12", "tw:w-12", "tw:w-16", "tw:w-40", "tw:w-28", null].filter((w) => w !== false)}
      onRowClick={(r) => peek.open(r.repoId)}
      rowClassName={(r) => peek.peek === r.repoId && "tw:bg-brand-bg/30 tw:shadow-[inset_2px_0_0_var(--primary)]"}
      empty={
        filters.active ? (
          <>
            No storage allocations match these filters.{" "}
            <button type="button" onClick={filters.reset} className="tw:font-medium tw:text-foreground tw:underline">Clear filters</button>
          </>
        ) : (
          "No storage allocations yet."
        )
      }
      toolbar={(table) => (
        <>
          <ReposToolbar table={table} filters={filters} columnLabels={noFacility ? { ...COLUMN_LABELS, facility: undefined } : COLUMN_LABELS} csv={{ filename: "repos-storage.csv", columns: CSV_COLUMNS }} />
          <ErrorAlert error={data.error} onRetry={data.refetch} what="storage allocations" className="tw:mb-3" />
        </>
      )}
    />
  );
}
