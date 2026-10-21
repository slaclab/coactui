"use client";

import { useMemo, useRef } from "react";
import { toast } from "sonner";
import { Copy, Crown, Download, Shield, UserPlus } from "lucide-react";

import { ActionsMenu, AllocationMeter, BulkButton, Chip, DataTable, Skeleton, sortHeader } from "../../kit";
import { canSelectRepo, needsAttention, repoActions } from "../../actions/repo-actions";
import { downloadCsv } from "../../lib/csv";
import { formatStoragePair } from "../../lib/format";
import { useDialogParam } from "../../lib/navigation";
import { useViewer } from "../../providers/viewer";
import { usePeek, useRepoFilters } from "./repo-filters";
import { RepoNameCell, ReposToolbar } from "./repos-toolbar";
import { RepoPeekSheet } from "./peek-sheet";
import { BulkAddMemberDialog } from "./bulk-add-member-dialog";

const ROLE = {
  PI: <Chip icon={Crown}>PI</Chip>,
  Leader: <Chip>Leader</Chip>,
  Member: <span className="tw:text-[13px] tw:text-muted-strong">Member</span>,
  "Czar view": <ViewRole label="Czar view" />,
  "Admin view": <ViewRole label="Admin view" />,
};
function ViewRole({ label }) {
  return (
    <span className="tw:flex tw:items-center tw:gap-1.5 tw:text-[13px] tw:whitespace-nowrap tw:text-muted-strong">
      <Shield className="tw:size-3.25 tw:text-muted-foreground" strokeWidth={2} />
      {label}
    </span>
  );
}
export const roleCell = (role) => ROLE[role] ?? role;

const CSV_COLUMNS = [
  { header: "facility", value: (r) => r.facility },
  { header: "repo", value: (r) => r.name },
  { header: "pi", value: (r) => r.principal },
  { header: "members", value: (r) => r.members },
  { header: "compute_7d_pct", value: (r) => (r.compute ? r.compute.pct.toFixed(1) : "") },
  { header: "compute_cluster", value: (r) => r.compute?.cluster ?? "" },
  { header: "storage_used_gb", value: (r) => r.storage?.usedGb ?? "" },
  { header: "storage_allocated_gb", value: (r) => r.storage?.allocatedGb ?? "" },
];

const COLUMN_LABELS = { facility: "Facility", role: "Your role", principal: "PI", members: "Members", compute: "Compute · 7d", storage: "Storage", group: "LDAP group", leaders: "Leaders", description: "Description" };

const meterSkeleton = <Skeleton className="tw:h-1.5 tw:w-20" />;

/**
 * /repos/info Overview table (spec §6 R3–R6). Contract: ReposTable({ rows, loading, hideFacility? }).
 * Filters live in the URL (useRepoFilters); rows are derived. `usageLoading` skeletons only
 * the meter cells. `peek` mounts the quick-look sheet (the repos page mounts its own, once).
 */
export function ReposTable({ rows, loading, hideFacility = false, usageLoading = false, peek: withPeek = true, showPresets = true }) {
  const { can } = useViewer();
  const filters = useRepoFilters(rows);
  const peek = usePeek();
  const { openDialog, isOpen } = useDialogParam();
  const noFacility = hideFacility || filters.singleFacility;
  // The table instance (selection lives inside DataTable), so a finished bulk add can clear it.
  const tableRef = useRef(null);

  const columns = useMemo(
    () =>
      [
        {
          accessorKey: "name",
          header: sortHeader("Repo"),
          cell: ({ row: { original: r } }) => <RepoNameCell row={r} href={peek.hrefFor(r.id)} />,
          enableHiding: false,
          meta: { cellClassName: "tw:min-w-60" },
        },
        !noFacility && { accessorKey: "facility", header: "Facility", cell: ({ getValue }) => <Chip>{getValue()}</Chip>, size: 96 },
        { accessorKey: "role", header: "Your role", cell: ({ getValue }) => roleCell(getValue()), size: 120 },
        { accessorKey: "principal", header: sortHeader("PI"), cell: ({ getValue }) => <span className="tw:font-mono tw:text-[13px]">{getValue()}</span>, size: 130 },
        {
          accessorKey: "members",
          header: sortHeader("Members", { align: "right" }),
          cell: ({ getValue }) => <span className="tw:block tw:text-right tw:tabular-nums">{getValue()}</span>,
          size: 88,
        },
        {
          id: "compute",
          accessorFn: (r) => r.compute?.pct ?? -1,
          header: (ctx) => (
            <span className="tw:flex tw:items-baseline tw:gap-1.5">
              {sortHeader("Compute · 7d")(ctx)}
              <span className="tw:text-xs tw:font-normal tw:text-muted-foreground">rollup</span>
            </span>
          ),
          cell: ({ row: { original: r } }) =>
            !r.hasCompute ? (
              <span className="tw:text-[13px] tw:text-muted-foreground">No allocation</span>
            ) : usageLoading ? (
              meterSkeleton
            ) : r.compute ? (
              <div className="tw:flex tw:items-center tw:gap-2.5">
                <AllocationMeter type="compute-used" pct={r.compute.pct} burst={r.compute.burst} label={`${r.name} compute used ${Math.round(r.compute.pct)}% of allocation on ${r.compute.cluster}, daily rollup 7 days`} />
                <span className="tw:font-mono tw:text-xs tw:whitespace-nowrap tw:text-muted-foreground">{r.compute.cluster}{r.compute.more ? ` +${r.compute.more}` : ""}</span>
              </div>
            ) : (
              <span className="tw:text-[13px] tw:text-muted-foreground">—</span>
            ),
          size: 200,
        },
        {
          id: "storage",
          accessorFn: (r) => (r.storage ? r.storage.usedGb / r.storage.allocatedGb : -1),
          header: sortHeader("Storage"),
          cell: ({ row: { original: r } }) =>
            r.storage ? (
              <AllocationMeter type="storage" pct={(r.storage.usedGb / r.storage.allocatedGb) * 100} label={`${r.name} storage ${formatStoragePair(r.storage.usedGb, r.storage.allocatedGb)} used`}>
                {formatStoragePair(r.storage.usedGb, r.storage.allocatedGb)}
              </AllocationMeter>
            ) : (
              <span className="tw:text-[13px] tw:text-muted-foreground">—</span>
            ),
          size: 200,
        },
        {
          accessorKey: "group",
          header: "LDAP group",
          cell: ({ getValue }) =>
            getValue() ? (
              <span className="tw:font-mono tw:text-[13px]">{getValue()}</span>
            ) : (
              <span className="tw:flex tw:items-center tw:gap-1.5 tw:text-[13px] tw:text-muted-foreground"><span className="tw:size-1.5 tw:rounded-full tw:bg-warn" aria-hidden />Not set</span>
            ),
        },
        { id: "leaders", accessorFn: (r) => r.leaders.join(", "), header: "Leaders", cell: ({ getValue }) => <span className="tw:line-clamp-1 tw:font-mono tw:text-xs">{getValue() || "—"}</span> },
        { accessorKey: "description", header: "Description", cell: ({ getValue }) => <span className="tw:line-clamp-1 tw:text-xs tw:text-muted-foreground">{getValue() || "—"}</span> },
        {
          id: "actions",
          header: () => <span className="tw:sr-only">Actions</span>,
          cell: ({ row: { original: r } }) => <ActionsMenu groups={repoActions(r, can, { peekHref: peek.hrefFor(r.id) })} label={`Actions for ${r.name}`} />,
          enableSorting: false,
          enableHiding: false,
          size: 48,
          meta: { cellClassName: "tw:px-0 tw:w-12", headerClassName: "tw:w-12" },
        },
      ].filter(Boolean),
    [can, peek.hrefFor, noFacility, usageLoading],
  );

  const selectable = can.isAdmin || can.isCzar;

  return (
    <>
      <DataTable
        columns={columns}
        data={filters.filtered}
        getRowId={(r) => r.id}
        loading={loading}
        skeleton={[selectable && null, "tw:w-40", !noFacility && "tw:w-12", "tw:w-16", "tw:w-14", "tw:w-8 tw:ml-auto", "tw:w-20", "tw:w-20", null].filter((w) => w !== false)}
        enableRowSelection={selectable ? (r) => canSelectRepo(r, can) : undefined}
        initialSorting={[{ id: "name", desc: false }]}
        initialColumnVisibility={{ group: false, leaders: false, description: false }}
        onRowClick={(r) => peek.open(r.id)}
        rowClassName={(r) => peek.peek === r.id && "tw:bg-brand-bg/30 tw:shadow-[inset_2px_0_0_var(--primary)]"}
        empty={
          filters.active ? (
            <>
              No repos match{filters.q ? ` “${filters.q}”` : " these filters"}
              {filters.facilities.length ? ` in ${filters.facilities.join(", ")}` : ""}.{" "}
              <button type="button" onClick={filters.reset} className="tw:font-medium tw:text-foreground tw:underline">Clear filters</button>
            </>
          ) : (
            "No repos to show."
          )
        }
        toolbar={(table) => {
          tableRef.current = table;
          return (
            <ReposToolbar table={table} filters={filters} columnLabels={noFacility ? { ...COLUMN_LABELS, facility: undefined } : COLUMN_LABELS} csv={{ filename: "repos.csv", columns: CSV_COLUMNS }} showPresets={showPresets} />
          );
        }}
        bulkActions={({ selected }) => (
          <>
            <BulkButton variant="primary" icon={UserPlus} onClick={() => openDialog("bulk-add-member", selected.map((r) => r.id).join(","))}>
              Add member…
            </BulkButton>
            <BulkButton icon={Download} onClick={() => downloadCsv("repos.csv", CSV_COLUMNS, selected)}>Export CSV</BulkButton>
            <BulkButton icon={Copy} onClick={() => navigator.clipboard?.writeText(selected.map((r) => r.name).join("\n")).then(() => toast.success(`Copied ${selected.length} names`))}>
              Copy names
            </BulkButton>
          </>
        )}
      />
      {withPeek && <RepoPeekSheet rows={rows} order={filters.filtered} loading={loading} usageLoading={usageLoading} />}
      {selectable && isOpen("bulk-add-member") && <BulkAddMemberDialog rows={rows} onDone={() => tableRef.current?.resetRowSelection()} />}
    </>
  );
}
