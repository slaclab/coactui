"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ActionsMenu, AllocationMeter, DataTable, Skeleton, sortHeader } from "../../kit";
import { formatStoragePair } from "../../lib/format";
import { routes } from "../../lib/routes";
import { useViewer } from "../../providers/viewer";
import { czarList } from "./facility-card";
import { facilityActions } from "./facility-actions";
import { FacilityMark } from "./facility-mark";
import { HealthBadge } from "./health-badge";
import { SORT_VALUE, storageUsedPct, tableSorting } from "./filters";

const worst = (list, key) => list.filter((c) => c[key] != null).sort((a, b) => b[key] - a[key])[0];
const muted = <span className="tw:text-[13px] tw:text-muted-foreground">—</span>;

/** F3b table view: rows are already filtered/sorted from the URL; ?sort seeds the sorting. */
export function FacilitiesTable({ rows, loading, usage, pendingLoading, sort, toolbar, empty }) {
  const router = useRouter();
  const { can } = useViewer();

  const columns = useMemo(
    () => [
      {
        id: "name",
        accessorFn: SORT_VALUE.name,
        header: sortHeader("Facility"),
        cell: ({ row: { original: f } }) => (
          <div className="tw:flex tw:items-center tw:gap-2.5">
            <FacilityMark size={24} />
            <Link href={routes.facility(f.name)} className="tw:font-semibold tw:text-foreground tw:no-underline tw:hover:underline">{f.name}</Link>
          </div>
        ),
        enableHiding: false,
      },
      {
        id: "health",
        accessorFn: SORT_VALUE.health,
        header: sortHeader("Health"),
        cell: ({ row: { original: f } }) => <HealthBadge health={f.health} facility={f.name} />,
        size: 110,
      },
      {
        id: "computeUsed",
        accessorFn: (f) => worst(f.compute, "pct")?.pct ?? -1,
        header: (ctx) => (
          <span className="tw:flex tw:items-baseline tw:gap-1.5">
            {sortHeader("Compute used · 7d")(ctx)}
            {usage.source === "rollup" && <span className="tw:text-xs tw:font-normal tw:text-muted-foreground">rollup</span>}
          </span>
        ),
        cell: ({ row: { original: f } }) => {
          if (!f.compute.length) return <span className="tw:text-[13px] tw:text-muted-foreground">No purchase</span>;
          if (usage.loading) return <Skeleton className="tw:h-4 tw:w-20" />;
          const c = worst(f.compute, "pct");
          if (!c) return muted;
          return (
            <ClusterMeter type="compute-used" pct={c.pct} burst={c.burstPercent} cluster={c.cluster} more={f.compute.length - 1} label={`${f.name} compute used ${Math.round(c.pct)}% of purchase on ${c.cluster}, 7 days`} />
          );
        },
        size: 210,
      },
      {
        id: "computeAllocated",
        accessorFn: (f) => worst(f.compute, "allocatedPct")?.allocatedPct ?? -1,
        header: sortHeader("Compute allocated"),
        cell: ({ row: { original: f } }) => {
          const c = worst(f.compute, "allocatedPct");
          if (!c) return muted;
          return <ClusterMeter type="compute-allocated" pct={c.allocatedPct} cluster={c.cluster} label={`${f.name} ${c.cluster} allocated ${Math.round(c.allocatedPct)}% of purchase`} />;
        },
        size: 200,
      },
      {
        id: "storage",
        accessorFn: storageUsedPct,
        header: sortHeader("Storage"),
        cell: ({ row: { original: f } }) =>
          f.storage ? (
            <AllocationMeter type="storage" pct={storageUsedPct(f)} label={`${f.name} storage ${formatStoragePair(f.storage.usedGb, f.storage.purchasedGb)} used`}>
              {formatStoragePair(f.storage.usedGb, f.storage.purchasedGb)}
            </AllocationMeter>
          ) : (
            muted
          ),
        size: 200,
      },
      {
        accessorKey: "repos",
        header: sortHeader("Repos", { align: "right" }),
        cell: ({ getValue }) => <span className="tw:block tw:text-right tw:tabular-nums">{getValue()}</span>,
        size: 80,
        meta: { headerClassName: "tw:text-right" },
      },
      {
        id: "pending",
        accessorFn: SORT_VALUE.pending,
        header: sortHeader("Pending"),
        cell: ({ row: { original: f } }) => {
          if (pendingLoading) return <Skeleton className="tw:h-4 tw:w-6" />;
          if (!f.pending) return muted;
          return (
            <Link href={routes.requests({ facilityname: f.name })} className="tw:flex tw:w-fit tw:items-center tw:gap-1.5 tw:text-foreground tw:no-underline tw:tabular-nums tw:hover:underline">
              <span className="tw:size-1.5 tw:rounded-full tw:bg-warn" aria-hidden />
              {f.pending}
            </Link>
          );
        },
        size: 90,
      },
      {
        id: "czars",
        accessorFn: (f) => f.czars.join(", "),
        header: "Czars",
        cell: ({ row: { original: f } }) => <span className="tw:font-mono tw:text-[13px] tw:whitespace-nowrap">{czarList(f.czars, 2)}</span>,
        enableSorting: false,
      },
      {
        accessorKey: "serviceaccount",
        header: "Service account",
        cell: ({ getValue }) => <span className="tw:font-mono tw:text-[13px]">{getValue() || "—"}</span>,
      },
      {
        id: "actions",
        header: () => <span className="tw:sr-only">Actions</span>,
        cell: ({ row: { original: f } }) => <ActionsMenu groups={facilityActions(f, can, { context: "row" })} label={`Actions for ${f.name}`} />,
        enableSorting: false,
        enableHiding: false,
        size: 48,
        meta: { cellClassName: "tw:px-0 tw:w-12", headerClassName: "tw:w-12" },
      },
    ],
    [can, usage.loading, usage.source, pendingLoading],
  );

  return (
    <DataTable
      key={sort}
      columns={columns}
      data={rows}
      getRowId={(f) => f.name}
      loading={loading}
      skeleton={["tw:w-24", "tw:w-14 tw:rounded-full", "tw:w-20", "tw:w-20", "tw:w-20", "tw:w-8 tw:ml-auto", "tw:w-6", "tw:w-24", null]}
      initialSorting={tableSorting(sort)}
      initialColumnVisibility={{ serviceaccount: false }}
      onRowClick={(f) => router.push(routes.facility(f.name))}
      rowClassName={() => "tw:h-11"}
      empty={empty}
      toolbar={toolbar}
    />
  );
}

function ClusterMeter({ type, pct, burst = 0, cluster, more, label }) {
  return (
    <div className="tw:flex tw:items-center tw:gap-2.5">
      <AllocationMeter type={type} pct={pct} burst={burst} label={label} />
      <span className="tw:font-mono tw:text-xs tw:whitespace-nowrap tw:text-muted-foreground">
        {cluster}
        {more > 0 ? ` +${more}` : ""}
      </span>
    </div>
  );
}
