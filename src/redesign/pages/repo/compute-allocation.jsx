"use client";

import { useMemo } from "react";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, EmptyState, ErrorAlert, LineTabs, MeterBar, SearchInput, SectionCard, Segmented, Skeleton, sortHeader, Toolbar } from "../../kit";
import { formatDate, formatInt, formatPct } from "../../lib/format";
import { useDialogParam, useQueryParam } from "../../lib/navigation";
import { routes } from "../../lib/routes";
import { ClientOnly } from "../../providers/apollo";
import { useViewer } from "../../providers/viewer";
import { useRepo } from "./repo-context";
import { computeAccess } from "./resources/cluster-block";
import { ComputeAllocationDialog } from "./resources/compute-allocation-dialog";
import { allocationMeta, cumulativeSeries, describeAllocation, RANGES, windowSeries } from "./resources/compute-math";
import { ChartSkeleton, DetailHeader, StatCards } from "./resources/detail-parts";
import { RecentJobs } from "./resources/jobs-table";
import { memberUsageRows } from "./resources/member-usage";
import { useComputeAllocationDetail } from "./resources/queries";
import { CumulativeComputeChart } from "./resources/usage-charts";

const HOUR = 3600000;
const VIEWS = [{ value: "users", label: "Users" }, { value: "jobs", label: "Jobs" }];

/** /repos/[facility]/[name]/compute/[allocationid] — replaces legacy compute.jsx. */
export function ComputeAllocationPage({ allocationid }) {
  return (
    <ClientOnly fallback={<DetailSkeleton />}>
      <ComputeAllocationLive allocationid={allocationid} />
    </ClientOnly>
  );
}

function DetailSkeleton() {
  return (
    <div className="tw:flex tw:flex-col tw:gap-5 tw:pt-6" aria-hidden>
      <div className="tw:flex tw:flex-col tw:gap-2">
        <Skeleton className="tw:h-4 tw:w-20" />
        <Skeleton className="tw:h-6 tw:w-56" />
      </div>
      <StatCards loading items={["Allocation", "Period", "Available", "Charged", "Remaining"].map((label) => ({ label }))} />
      <ChartSkeleton />
      <Skeleton className="tw:h-40 tw:w-full" />
    </div>
  );
}

function ComputeAllocationLive({ allocationid }) {
  const { repo } = useRepo();
  const detail = useComputeAllocationDetail(allocationid);
  if (!repo || detail.loading) return <DetailSkeleton />;
  if (detail.error && !detail.alloc) return <ErrorAlert className="tw:mt-6" error={detail.error} onRetry={detail.refetch} what="compute allocation" />;
  if (detail.notFound)
    return (
      <EmptyState
        className="tw:mt-6"
        icon={FileQuestion}
        title="Allocation not found"
        description={`This allocation doesn’t belong to ${repo.facility}/${repo.name} or no longer exists.`}
        actions={<Button asChild size="sm" variant="outline"><Link href={routes.repo(repo.facility, repo.name, "compute")}>Back to compute</Link></Button>}
      />
    );
  return <ComputeAllocationBody repo={repo} detail={detail} />;
}

function ComputeAllocationBody({ repo, detail }) {
  const { can } = useViewer();
  const access = computeAccess(repo, can);
  const { dialog, openDialog, closeDialog } = useDialogParam();
  const [rangeRaw, setRange] = useQueryParam("range", "all");
  const range = RANGES.some((r) => r.value === rangeRaw) ? rangeRaw : "all";
  const [viewRaw, setView] = useQueryParam("view", "users");
  const view = VIEWS.some((v) => v.value === viewRaw) ? viewRaw : "users";

  const a = detail.alloc;
  const d = useMemo(() => describeAllocation(a, detail.facilityObj, detail.cores), [a, detail.facilityObj, detail.cores]);
  const series = useMemo(() => cumulativeSeries(a.perDateUsage, d), [a.perDateUsage, d]);
  const shown = useMemo(() => windowSeries(series, range), [series, range]);

  const fullHours = Math.max(0, (Date.parse(a.end) - Date.parse(a.start)) / HOUR) || 0;
  const available = d.nodes * d.coresPerNode * fullHours;
  const remaining = available ? Math.max(0, (1 - d.used / available) * 100) : null;
  const isCurrent = (detail.repo?.currentComputeAllocations ?? []).some((x) => x.Id === a.Id);

  return (
    <div className="tw:flex tw:flex-col tw:gap-5 tw:pt-6">
      <DetailHeader
        backHref={routes.repo(repo.facility, repo.name, "compute")}
        backLabel="Compute"
        title={<><span className="tw:font-mono">{a.clustername}</span> allocation</>}
        meta={
          <>
            <span>{allocationMeta(d, repo.facility)}</span>
            <Link href={routes.cluster(a.clustername)} className="tw:font-medium tw:text-foreground tw:underline-offset-2 tw:hover:underline">Cluster usage →</Link>
          </>
        }
        action={access.any && isCurrent && <Button variant="outline" size="sm" onClick={() => openDialog("compute-allocation", a.clustername)}>{access.label}</Button>}
      />

      <StatCards
        items={[
          { label: "Allocation", value: `${formatPct(a.percentOfFacility ?? 0)} · ${formatInt(Math.round(d.nodes * 10) / 10)} nodes`, sub: a.burstPercentOfFacility ? `burst ${formatPct(a.burstPercentOfFacility)}` : "no burst" },
          { label: "Period", value: <span className="tw:text-[15px]">{formatDate(a.start)} – {formatDate(a.end)}</span> },
          { label: "Available in period", value: available ? formatInt(Math.round(available)) : null, sub: "resource-h" },
          { label: "Charged (lifetime)", value: formatInt(Math.round(d.used)), sub: "resource-h" },
          { label: "Remaining", value: formatPct(remaining), sub: d.pct != null ? `${formatPct(d.pct)} of the pace to date` : null },
        ]}
      />

      <SectionCard
        title="Cumulative resource-hours vs uniform pace"
        caption="Daily rollup from the period start; the dashed line is the allocation spent evenly over the period."
        action={<Segmented label="Range" size="sm" items={RANGES} value={range} onChange={(v) => setRange(v)} />}
        bodyClassName="tw:flex tw:flex-col tw:gap-3.5"
      >
        {shown.length ? <CumulativeComputeChart rows={shown} /> : <p className="tw:flex tw:h-[240px] tw:items-center tw:justify-center tw:text-[13px] tw:text-muted-foreground">No daily usage recorded for this allocation yet.</p>}
      </SectionCard>

      <div className="tw:flex tw:flex-col">
        <LineTabs items={VIEWS} value={view} onChange={(v) => setView(v)} />
        {view === "users" ? <UsersView alloc={a} members={detail.repo?.users ?? []} /> : <div className="tw:pt-4"><RecentJobs allocationId={a.Id} title="Jobs" /></div>}
      </div>

      {access.any && isCurrent && (
        <ComputeAllocationDialog
          open={dialog === "compute-allocation"}
          onClose={closeDialog}
          allocate={false}
          cluster={a.clustername}
          onCluster={() => {}}
          repo={repo}
          facilityObj={detail.facilityObj}
          allocations={[a]}
          unallocated={[]}
          access={access}
        />
      )}
    </div>
  );
}

const userColumns = [
  { accessorKey: "username", header: sortHeader("User"), cell: ({ getValue }) => <span className="tw:font-mono">{getValue()}</span> },
  { accessorKey: "rh", header: sortHeader("Resource-h", { align: "right" }), meta: { headerClassName: "tw:text-right tw:w-40", cellClassName: "tw:text-right tw:tabular-nums" }, cell: ({ getValue }) => formatInt(Math.round(getValue())) },
  {
    accessorKey: "share",
    header: sortHeader("% of repo usage"),
    meta: { headerClassName: "tw:w-75 tw:pl-6", cellClassName: "tw:pl-6" },
    cell: ({ getValue }) => (
      <div className="tw:flex tw:items-center tw:gap-2.5">
        <MeterBar pct={getValue()} className="tw:w-40" />
        <span className="tw:text-[13px] tw:tabular-nums">{formatPct(getValue())}</span>
      </div>
    ),
  },
];

function UsersView({ alloc, members }) {
  const [q, setQ] = useQueryParam("q", "");
  const rows = useMemo(() => memberUsageRows(alloc.perUserUsage, members), [alloc.perUserUsage, members]);
  return (
    <DataTable
      columns={userColumns}
      data={rows}
      getRowId={(r) => r.username}
      globalFilter={q}
      globalFilterFn={(r, s) => r.username.toLowerCase().includes(s)}
      initialSorting={[{ id: "rh", desc: true }]}
      empty={rows.length ? "No users match the filter." : "No member has used this allocation."}
      toolbar={<Toolbar start={<SearchInput value={q} onChange={setQ} placeholder="Filter users…" />} end={<span className="tw:text-xs tw:text-muted-foreground">Usage since {formatDate(alloc.start)}</span>} />}
    />
  );
}
