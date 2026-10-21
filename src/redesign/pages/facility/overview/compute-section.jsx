"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Cpu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ActionsMenu, AllocationMeter, DataTable, EmptyState, ErrorAlert, meterStatus, SectionCard, Skeleton, STATUS_TEXT } from "../../../kit";
import { daysBehind, fmtLongDay } from "../../../lib/dates";
import { formatCapacity, formatPct } from "../../../lib/format";
import { useDialogParam } from "../../../lib/navigation";
import { routes } from "../../../lib/routes";
import { useFacility } from "../facility-context";
import { computeAddGate, computeRowActions, DIALOGS } from "../facility-actions";
import { useFacilityLive, useFacilityRollups, usePurchaseCoverage } from "../queries";
import { AddPurchaseButton, FLUSH_TABLE_BODY } from "./section-parts";
import { TopReposPopover } from "./top-repos-popover";

const CAPTION = "Usage as % of purchase. Live excludes preemptable QOS; daily rollup uses the current purchase as denominator.";
const NUM = "tw:block tw:text-right tw:tabular-nums";
// First column of a header group: divider on the left; the group label sits above its header.
const groupStart = { headerClassName: "tw:border-l", cellClassName: "tw:border-l" };
const right = { headerClassName: "tw:text-right", cellClassName: "tw:text-right" };

/** Overview › Compute (spec §5a): purchase, allocation, Live (jobs) and Daily rollup per cluster. */
export function ComputeSection() {
  const f = useFacility();
  const { name, facility, loading, canManage } = f;
  const { openDialog } = useDialogParam();
  const { clusters, allPurchased } = usePurchaseCoverage(facility);
  const live = useFacilityLive(name, canManage);
  const rollups = useFacilityRollups(name);
  const gate = computeAddGate(f, allPurchased);

  const rows = useMemo(() => {
    const byName = Object.fromEntries(clusters.map((c) => [c.name, c]));
    return [...(facility?.computepurchases ?? [])]
      .sort((a, b) => b.purchased - a.purchased || a.clustername.localeCompare(b.clustername))
      .map((p) => ({ ...p, cluster: byName[p.clustername] }));
  }, [facility, clusters]);

  const columns = useMemo(() => {
    const liveCell = (key) =>
      function LiveCell({ row: { original: p } }) {
        if (!canManage) return <span className={cn(NUM, "tw:text-muted-foreground")}>—</span>;
        if (live.loading) return <Skeleton className="tw:ml-auto tw:h-4 tw:w-10" />;
        const v = live.byCluster[p.clustername]?.[key];
        if (v == null) return <span className={cn(NUM, "tw:text-muted-foreground")} title={live.error ? "Couldn't load live usage" : "No live job data"}>—</span>;
        if (key === "week") return <AllocationMeter type="compute-used" pct={v} burst={p.burstPercent ?? 0} label={`${p.clustername} live usage, past 7 days, ${formatPct(v)} of purchase`} />;
        const status = meterStatus("compute-used", v, p.burstPercent ?? 0);
        return <span className={cn(NUM, status && cn("tw:font-semibold", STATUS_TEXT[status]))}>{formatPct(v)}</span>;
      };
    const rollupCell = (key) =>
      function RollupCell({ row: { original: p } }) {
        if (rollups.loading) return <Skeleton className="tw:ml-auto tw:h-4 tw:w-10" />;
        const v = rollups.byCluster[p.clustername]?.[key];
        return <span className={cn(NUM, "tw:text-muted-strong")}>{v == null ? "—" : formatPct(v)}</span>;
      };
    // Flat columns with two-line headers: the kit DataTable doesn't set colSpan on grouped
    // headers yet (kit request), so the group label rides on its first column instead.
    const liveLabel = <LiveGroupHeader gated={!canManage} />;
    const rollupLabel = <span title={rollups.anchor ? `Through ${fmtLongDay(rollups.anchor)}` : undefined}>Daily rollup</span>;
    return [
      {
        id: "cluster",
        header: () => <TwoLine label="Cluster" />,
        cell: ({ row: { original: p } }) => (
          <div className="tw:flex tw:min-w-44 tw:flex-col tw:gap-0.5 tw:py-2">
            <Link href={routes.cluster(p.clustername)} className="tw:w-fit tw:font-mono tw:text-sm tw:font-medium tw:text-foreground tw:underline tw:decoration-border tw:underline-offset-4 tw:hover:decoration-foreground">
              {p.clustername}
            </Link>
            <span className="tw:text-xs tw:text-muted-foreground">{formatCapacity(p.purchased, p.cluster)}</span>
          </div>
        ),
        meta: { headerClassName: "tw:pl-5", cellClassName: "tw:pl-5 tw:w-full" },
      },
      {
        id: "burst",
        header: () => <TwoLine label={<span title="Burst · % of purchase">Burst</span>} />,
        cell: ({ row: { original: p } }) => <span className={NUM}>{p.burstPercent > 0 ? formatPct(p.burstPercent) : "—"}</span>,
        size: 72,
        meta: right,
      },
      {
        id: "allocated",
        header: () => <TwoLine label="Allocated to repos" />,
        cell: ({ row: { original: p } }) => (
          <div className="tw:flex tw:items-center tw:gap-1">
            <AllocationMeter type="compute-allocated" pct={p.allocated ?? 0} label={`${p.clustername}: ${formatPct(p.allocated)} of the purchase allocated to repos`} />
            <TopReposPopover facility={name} cluster={p.clustername} purchased={p.purchased} />
          </div>
        ),
        size: 230,
        meta: { headerClassName: "tw:pl-5", cellClassName: "tw:pl-5" },
      },
      { id: "hour", header: () => <TwoLine group={liveLabel} label="Past hour" />, cell: liveCell("hour"), size: 104, meta: groupStart },
      { id: "day", header: () => <TwoLine label="24h" align="right" />, cell: liveCell("day"), size: 76, meta: right },
      { id: "week", header: () => <TwoLine label="7 days" />, cell: liveCell("week"), size: 192, meta: { headerClassName: "tw:pl-5", cellClassName: "tw:pl-5" } },
      { id: "month", header: () => <TwoLine group={rollupLabel} label="30d" />, cell: rollupCell("month"), size: 104, meta: groupStart },
      { id: "ytd", header: () => <TwoLine label="YTD" align="right" />, cell: rollupCell("ytd"), size: 72, meta: right },
      { id: "lastYear", header: () => <TwoLine label="Last yr" align="right" />, cell: rollupCell("lastYear"), size: 80, meta: right },
      {
        id: "actions",
        header: () => <span className="tw:sr-only">Actions</span>,
        cell: ({ row: { original: p } }) => (
          <ActionsMenu groups={computeRowActions(f, p.clustername)} onDialog={(d, item) => openDialog(d, item.target)} label={`Actions for ${p.clustername}`} />
        ),
        size: 48,
        meta: { cellClassName: "tw:px-0 tw:w-12", headerClassName: "tw:w-12" },
      },
    ];
  }, [f, name, canManage, live, rollups, openDialog]);

  const stale = rollups.anchor && daysBehind(rollups.anchor) > 2;
  const caption = <>{CAPTION}{stale && <> Daily rollup through {fmtLongDay(rollups.anchor)}.</>}</>;
  const action = canManage && <AddPurchaseButton label="Add compute purchase" gate={gate} onClick={() => openDialog(DIALOGS.computePurchase)} />;

  if (!loading && !rows.length) {
    return (
      <SectionCard title="Compute" caption={caption}>
        <EmptyState
          icon={Cpu}
          title="No compute purchased yet"
          description={f.canEditPurchases ? undefined : "Contact Coact admins to add a purchase."}
          actions={f.canEditPurchases && !gate && <Button size="sm" onClick={() => openDialog(DIALOGS.computePurchase)}>Add compute purchase</Button>}
          className="tw:border-0 tw:py-8"
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Compute" caption={caption} action={action} className="tw:overflow-hidden" bodyClassName={FLUSH_TABLE_BODY}>
      {(live.error || rollups.error) && (
        <div className="tw:flex tw:flex-col tw:gap-2 tw:px-5 tw:pb-3">
          <ErrorAlert error={live.error} onRetry={live.refetch} what="live usage" />
          <ErrorAlert error={rollups.error} onRetry={rollups.refetch} what="daily rollups" />
        </div>
      )}
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(p) => p.clustername}
        loading={loading}
        skeleton={["tw:w-40", "tw:w-10 tw:ml-auto", "tw:w-20", "tw:w-10 tw:ml-auto", "tw:w-10 tw:ml-auto", "tw:w-20", "tw:w-10 tw:ml-auto", "tw:w-10 tw:ml-auto", "tw:w-10 tw:ml-auto", null]}
        footer={false}
        rowClassName={() => "tw:h-15"}
      />
    </SectionCard>
  );
}

/** Header with an optional group label line above it ("Live (jobs)" over "Past hour"). */
function TwoLine({ group, label, align }) {
  return (
    <span className={cn("tw:flex tw:flex-col tw:py-1.5 tw:leading-4", align === "right" && "tw:items-end")}>
      <span className="tw:text-xs tw:font-medium tw:whitespace-nowrap tw:text-muted-strong">{group ?? "\u00a0"}</span>
      <span className="tw:mt-1">{label}</span>
    </span>
  );
}

/** "Live (jobs)" group header; read-only viewers get a popover explaining the gate. */
function LiveGroupHeader({ gated }) {
  if (!gated) return "Live (jobs)";
  return (
    <Popover>
      <PopoverTrigger className="tw:underline tw:decoration-dotted tw:underline-offset-4">Live (jobs)</PopoverTrigger>
      <PopoverContent className="tw:w-64 tw:text-[13px]">Live usage is visible to facility czars.</PopoverContent>
    </Popover>
  );
}
