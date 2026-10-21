"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Chip, DataTable, ErrorAlert, FacetFilter, ResetButton, SearchInput, Segmented, sortHeader, Toolbar } from "../../../kit";
import { fmtLongDay } from "../../../lib/dates";
import { formatInt, formatResourceHours } from "../../../lib/format";
import { routes } from "../../../lib/routes";
import { ShareCell } from "../components/share-cell";
import { SOURCES } from "../constants";
import { countBy, matchesFilters, userTotals } from "../usage-model";

const FIELDS = ["username", "repo"];

/**
 * Per-user rows the viewer may see: admins everything, czars only their facilities (the API
 * only checks authentication here, so the UI applies the spec's gate). Then ?q / ?facility.
 */
export function userRows(users, cluster, can, filters) {
  const all = cluster ? userTotals(users.rows, cluster, users.days).filter((r) => can.isCzarOf(r.facility)) : [];
  return { all, filtered: all.filter((r) => matchesFilters(r, filters, FIELDS)) };
}

export function userCsv(users, cluster, can, filters) {
  return {
    columns: [
      { header: "username", value: (r) => r.username },
      { header: "facility", value: (r) => r.facility },
      { header: "repo", value: (r) => r.repo },
      { header: "used_resource_hours", value: (r) => Math.round(r.used) },
      { header: "share_of_cluster_pct", value: (r) => r.share?.toFixed(3) ?? "" },
    ],
    rows: [...userRows(users, cluster, can, filters).filtered].sort((a, b) => b.used - a.used),
  };
}

/** By user: rollup (anchored window) or live jobs since the rollup; table only, no chart. */
export function UserTab({ users, cluster, clustername, anchor, source, onSource, can, filters, loading, empty, span }) {
  const { q, setQ, facilities, setFacilities, active, reset } = filters;
  const { all, filtered } = useMemo(() => userRows(users, cluster, can, { q, facilities }), [users, cluster, can, q, facilities]);
  const busy = loading || users.loading;
  const live = source === "live";

  const columns = useMemo(
    () => [
      {
        accessorKey: "username",
        header: sortHeader("User"),
        cell: ({ getValue }) => <span className="tw:font-mono tw:text-sm tw:font-medium">{getValue()}</span>,
        meta: { cellClassName: "tw:pl-4", headerClassName: "tw:pl-4" },
      },
      {
        accessorKey: "repo",
        header: sortHeader("Repo"),
        cell: ({ row: { original: r } }) => (
          <Link href={routes.repo(r.facility, r.repo, "compute")} className="tw:font-mono tw:text-[13px] tw:text-foreground tw:no-underline tw:hover:underline">{r.repo}</Link>
        ),
        size: 220,
      },
      { accessorKey: "facility", header: sortHeader("Facility"), cell: ({ getValue }) => <Chip>{getValue()}</Chip>, size: 110 },
      {
        accessorKey: "used",
        header: sortHeader("Used", { align: "right" }),
        cell: ({ getValue }) => <span className="tw:block tw:text-right tw:tabular-nums">{formatResourceHours(getValue())}</span>,
        size: 150,
      },
      {
        id: "share",
        accessorFn: (r) => r.share ?? -1,
        header: sortHeader("Share of cluster"),
        cell: ({ row: { original: r } }) => <ShareCell pct={r.share} label={`Share of ${clustername} capacity: ${Math.round(r.share ?? 0)}%`} />,
        size: 190,
        meta: { cellClassName: "tw:pl-6 tw:pr-4", headerClassName: "tw:pl-6 tw:pr-4" },
      },
    ],
    [clustername],
  );

  const emptyCopy =
    all.length === 0 ? (
      live ? `No jobs since the last rollup${anchor ? ` (${fmtLongDay(anchor)})` : ""}.` : `No per-user usage for ${clustername} in this range.`
    ) : (
      <>
        No users or repos match{q ? ` “${q}”` : " these filters"}.{" "}
        <button type="button" onClick={reset} className="tw:font-medium tw:text-foreground tw:underline">Clear filters</button>
      </>
    );

  if (empty) {
    return <p className="tw:flex tw:h-40 tw:items-center tw:justify-center tw:rounded-xl tw:border tw:bg-background tw:text-[13px] tw:text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="tw:flex tw:flex-col tw:gap-1">
      <div className="tw:flex tw:items-center tw:justify-between tw:gap-4">
        <div>
          <h2 className="tw:text-[15px] tw:leading-5.5 tw:font-semibold">Usage by user · {live ? `since ${anchor ? fmtLongDay(anchor) : "the last rollup"}` : span}</h2>
          <p className="tw:mt-0.5 tw:text-xs tw:text-muted-foreground">
            {live ? "Live from the jobs collection; not yet in the daily rollup" : "From the daily rollup, same window as the other tabs"}
            {!can.isAdmin && " · facilities you manage"}
          </p>
        </div>
        <Segmented label="Source" size="sm" items={SOURCES} value={source} onChange={onSource} />
      </div>
      {users.error ? (
        <ErrorAlert className="tw:mt-3" error={users.error} onRetry={users.refetch} what="per-user usage" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowId={(r) => r.id}
          loading={busy}
          skeleton={["tw:w-24", "tw:w-36", "tw:w-12", "tw:w-24 tw:ml-auto", "tw:w-32"]}
          initialSorting={[{ id: "used", desc: true }]}
          empty={emptyCopy}
          toolbar={
            <Toolbar
              start={
                <>
                  <SearchInput value={q} onChange={setQ} placeholder="Filter users or repos…" />
                  <FacetFilter label="Facility" options={countBy(all, "facility")} selected={facilities} onChange={setFacilities} />
                  {active ? <ResetButton onClick={reset} /> : null}
                </>
              }
              end={<span className="tw:text-[13px] tw:text-muted-foreground tw:tabular-nums">Sorted by usage · {formatInt(new Set(filtered.map((r) => r.username)).size)} users</span>}
            />
          }
        />
      )}
    </div>
  );
}
