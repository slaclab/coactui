"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { Info } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ActionsMenu, Chip, DataTable, ErrorAlert, MeterBar, meterStatus, Skeleton, sortHeader, STATUS_TEXT } from "../../kit";
import { needsAttention, repoActions } from "../../actions/repo-actions";
import { formatInt, formatPct, formatResourceHours } from "../../lib/format";
import { routes } from "../../lib/routes";
import { useViewer } from "../../providers/viewer";
import { usePeek, useRepoFilters } from "./repo-filters";
import { RepoNameCell, ReposToolbar } from "./repos-toolbar";
import { ComputeOptions, useComputeOptions } from "./compute-options";
import { LIVE_WINDOWS, useComputeRows } from "./queries";

const WINDOW_LABEL = { pastHour: "Past hour", pastDay: "Past day", pastWeek: "Past week" };
const COLUMN_LABELS = { facility: "Facility", cluster: "Cluster", allocation: "Allocation", pastHour: "Past hour", pastDay: "Past day", pastWeek: "Past week", rollup30: "30 days", total: "Total used", period: "Period" };
const WINDOW_HOURS = { pastHour: 1, pastDay: 24, pastWeek: 168 };

const shortDate = (v, withYear) => (v ? new Date(v).toLocaleDateString("en", { month: "short", day: "numeric", ...(withYear && { year: "numeric" }), timeZone: "UTC" }) : "—");
// "Jan 1 – Dec 31" within one year; years shown when the period spans more than one.
function period(start, end) {
  const span = start && end && new Date(start).getUTCFullYear() !== new Date(end).getUTCFullYear();
  return `${shortDate(start, span)} – ${shortDate(end, span)}`;
}
const fmtNum = (v) => (v == null ? "—" : Number(v.toFixed(2)).toLocaleString("en"));

const CSV_COLUMNS = [
  { header: "facility", value: (r) => r.facility },
  { header: "repo", value: (r) => r.name },
  { header: "cluster", value: (r) => r.alloc?.cluster ?? "" },
  { header: "percent_of_facility", value: (r) => r.alloc?.percentOfFacility ?? "" },
  { header: "nodes", value: (r) => r.alloc?.nodes ?? "" },
  { header: "burst_percent_of_facility", value: (r) => r.alloc?.burstPercentOfFacility ?? "" },
  ...LIVE_WINDOWS.map((w) => ({ header: `${w}_pct_of_facility`, value: (r) => r.live?.[w]?.facilityPct ?? "" })),
  { header: "rollup_30d_resource_hours", value: (r) => r.rollup30Rh ?? "" },
  { header: "total_resource_hours", value: (r) => r.alloc?.totalUsedRh ?? "" },
  { header: "start", value: (r) => r.alloc?.start ?? "" },
  { header: "end", value: (r) => r.alloc?.end ?? "" },
];

/** CompAllocDetails (legacy popover), without Bootstrap: purchase → allocation math. */
function AllocationDetails({ row }) {
  const a = row.alloc;
  const items = [
    ["Purchased", `${fmtNum(a.purchased)} nodes`],
    ["Allocated", `${fmtNum(a.allocated)} nodes`],
    ["CPUs per node", fmtNum(a.perNode)],
    ["Facility resource-h per hour", `${fmtNum(a.purchased)} × ${fmtNum(a.perNode)} = ${fmtNum(a.purchased * a.perNode)}`],
    ["Repo resource-h per hour", fmtNum(a.allocated * a.perNode)],
    ["Burst", a.burstPercentOfFacility ? `${formatPct(a.burstPercentOfFacility)} of facility` : "None"],
  ];
  return (
    <Popover>
      <PopoverTrigger
        className="tw:inline-flex tw:size-6 tw:items-center tw:justify-center tw:rounded tw:text-muted-foreground tw:hover:bg-muted tw:hover:text-foreground"
        aria-label={`Allocation details for ${row.name} on ${a.cluster}`}
      >
        <Info className="tw:size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="tw:w-80">
        <p className="tw:mb-2 tw:text-[13px] tw:font-semibold">
          <span className="tw:font-mono">{row.name}</span> on <span className="tw:font-mono">{a.cluster}</span>
        </p>
        <dl className="tw:grid tw:grid-cols-[1fr_auto] tw:gap-x-4 tw:gap-y-1.5 tw:text-xs">
          {items.map(([t, v]) => (
            <div key={t} className="tw:contents">
              <dt className="tw:text-muted-foreground">{t}</dt>
              <dd className="tw:text-right tw:tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}

function LiveCell({ row, window, pctOfRepo, loading }) {
  if (!row.alloc) return null;
  if (loading) return <Skeleton className="tw:ml-auto tw:h-1.5 tw:w-20" />;
  const u = row.live?.[window];
  if (!u) return <span className="tw:block tw:text-right tw:text-[13px] tw:text-muted-foreground">—</span>;
  const pct = pctOfRepo ? u.repoPct : u.facilityPct;
  const status = pctOfRepo && pct != null ? meterStatus("compute-used", pct, row.alloc.burstPct) : null;
  return (
    <div
      className="tw:flex tw:items-center tw:justify-end tw:gap-2"
      title={`${formatInt(Math.round(u.resourceHours))} resource-h in the ${WINDOW_LABEL[window].toLowerCase()} (${WINDOW_HOURS[window]} h)`}
    >
      <span className={cn("tw:text-[13px] tw:tabular-nums", status && STATUS_TEXT[status])}>{formatPct(pct)}</span>
      <MeterBar pct={pct ?? 0} status={status} className="tw:w-14" />
    </div>
  );
}

/** Compute preset (?view=compute): one row per repo × cluster (spec §6 "Compute preset"). */
export function ComputeTable({ showAll, repoRows }) {
  const { can } = useViewer();
  const options = useComputeOptions();
  const data = useComputeRows({ showAll, includePreempt: options.includePreempt, enabled: true });
  const peek = usePeek();

  // Needs attention is a repo-level signal (Overview rows); expanded rows inherit it.
  const attnIds = useMemo(() => new Set(repoRows.filter(needsAttention).map((r) => r.id)), [repoRows]);
  const attnOf = useCallback((r) => attnIds.has(r.repoId), [attnIds]);
  const repoKey = useCallback((r) => r.repoId, []);
  const filters = useRepoFilters(data.rows, { attnOf, repoKey });

  const visible = useMemo(
    () => (options.hideUnused && !data.rollupLoading ? filters.filtered.filter((r) => r.rollup30Rh > 0) : filters.filtered),
    [filters.filtered, options.hideUnused, data.rollupLoading],
  );
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
        {
          id: "cluster",
          accessorFn: (r) => r.alloc?.cluster ?? "",
          header: sortHeader("Cluster"),
          cell: ({ row: { original: r } }) =>
            r.alloc ? (
              <Link href={routes.computeAllocation(r.facility, r.name, r.alloc.id)} className="tw:font-mono tw:text-[13px] tw:text-foreground tw:no-underline tw:hover:underline">
                {r.alloc.cluster}
              </Link>
            ) : (
              <span className="tw:text-[13px] tw:text-muted-foreground">No allocation</span>
            ),
          size: 110,
        },
        {
          id: "allocation",
          accessorFn: (r) => r.alloc?.percentOfFacility ?? -1,
          header: sortHeader("Allocation"),
          cell: ({ row: { original: r } }) =>
            r.alloc ? (
              <span className="tw:flex tw:items-center tw:gap-1 tw:text-[13px] tw:whitespace-nowrap tw:tabular-nums">
                {formatPct(r.alloc.percentOfFacility)} · {fmtNum(r.alloc.nodes)} nodes
                <AllocationDetails row={r} />
              </span>
            ) : null,
          size: 170,
        },
        ...LIVE_WINDOWS.map((w) => ({
          id: w,
          accessorFn: (r) => (options.pctOfRepo ? r.live?.[w]?.repoPct : r.live?.[w]?.facilityPct) ?? -1,
          header: sortHeader(WINDOW_LABEL[w], { align: "right" }),
          cell: ({ row: { original: r } }) => <LiveCell row={r} window={w} pctOfRepo={options.pctOfRepo} loading={data.liveLoading} />,
          size: 120,
        })),
        {
          id: "rollup30",
          accessorFn: (r) => r.rollup30Pct ?? -1,
          header: sortHeader("30 days", { align: "right" }),
          cell: ({ row: { original: r } }) =>
            !r.alloc ? null : data.rollupLoading ? (
              <Skeleton className="tw:ml-auto tw:h-4 tw:w-10" />
            ) : (
              <span className="tw:block tw:text-right tw:text-[13px] tw:tabular-nums" title={`${formatInt(Math.round(r.rollup30Rh))} resource-h in the last 30 days of the daily rollup`}>
                {formatPct(r.rollup30Pct)}
              </span>
            ),
          size: 90,
        },
        {
          id: "total",
          accessorFn: (r) => r.alloc?.totalUsedRh ?? -1,
          header: sortHeader("Total used", { align: "right" }),
          cell: ({ row: { original: r } }) => (r.alloc ? <span className="tw:block tw:text-right tw:text-[13px] tw:whitespace-nowrap tw:tabular-nums">{formatResourceHours(r.alloc.totalUsedRh)}</span> : null),
          size: 130,
        },
        {
          id: "period",
          accessorFn: (r) => r.alloc?.start ?? "",
          header: "Period",
          cell: ({ row: { original: r } }) =>
            r.alloc ? <span className="tw:text-[13px] tw:whitespace-nowrap tw:text-muted-strong">{period(r.alloc.start, r.alloc.end)}</span> : null,
          size: 130,
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
    [can, peek.hrefFor, noFacility, options.pctOfRepo, data.liveLoading, data.rollupLoading],
  );

  const empty = filters.active ? (
    <>
      No compute allocations match these filters.{" "}
      <button type="button" onClick={filters.reset} className="tw:font-medium tw:text-foreground tw:underline">Clear filters</button>
    </>
  ) : options.hideUnused ? (
    "No repos used compute in the last 30 days. Turn off “Hide unused (30d)” to see all."
  ) : (
    "No compute allocations match these filters."
  );

  return (
    <div className="tw:flex tw:flex-col">
      <DataTable
        columns={columns}
        data={visible}
        getRowId={(r) => r.rowId}
        loading={data.loading}
        skeleton={["tw:w-40", !noFacility && "tw:w-12", "tw:w-16", "tw:w-24", "tw:w-20 tw:ml-auto", "tw:w-20 tw:ml-auto", "tw:w-20 tw:ml-auto", "tw:w-10 tw:ml-auto", "tw:w-24 tw:ml-auto", "tw:w-24", null].filter((w) => w !== false)}
        onRowClick={(r) => peek.open(r.repoId)}
        rowClassName={(r) => peek.peek === r.repoId && "tw:bg-brand-bg/30 tw:shadow-[inset_2px_0_0_var(--primary)]"}
        empty={empty}
        toolbar={(table) => (
          <>
            <ReposToolbar table={table} filters={filters} columnLabels={noFacility ? { ...COLUMN_LABELS, facility: undefined } : COLUMN_LABELS} csv={{ filename: "repos-compute.csv", columns: CSV_COLUMNS }} />
            <ComputeOptions options={options} />
            <div className="tw:flex tw:flex-col tw:gap-2">
              <ErrorAlert error={data.error} onRetry={data.refetch} what="compute allocations" className="tw:mb-3" />
              <ErrorAlert error={data.liveError} onRetry={data.refetchLive} what="live usage" className="tw:mb-3" />
              <ErrorAlert error={data.rollupError} onRetry={data.refetchRollup} what="30-day rollup" className="tw:mb-3" />
            </div>
          </>
        )}
      />
    </div>
  );
}
