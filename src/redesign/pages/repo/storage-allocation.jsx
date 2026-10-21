"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton, DefinitionList, EmptyState, ErrorAlert, SectionCard, Segmented, Skeleton } from "../../kit";
import { formatDate, formatPct, formatStorage } from "../../lib/format";
import { useDialogParam, useQueryParam } from "../../lib/navigation";
import { routes } from "../../lib/routes";
import { ClientOnly } from "../../providers/apollo";
import { useViewer } from "../../providers/viewer";
import { useRepo } from "./repo-context";
import { formatCount } from "./resources/compute-math";
import { ChartSkeleton, DetailHeader } from "./resources/detail-parts";
import { useStorageAllocationDetail } from "./resources/queries";
import { StorageAllocationDialog } from "./resources/storage-allocation-dialog";
import { describeStorage, storageAccess } from "./resources/storage-block";
import { StorageUsageChart } from "./resources/usage-charts";
import { UsageMeter } from "./resources/usage-meter";

const thisYear = new Date().getUTCFullYear();
const YEARS = [thisYear, thisYear - 1, thisYear - 2].map((y) => ({ value: String(y), label: String(y) }));
const METRICS = [{ value: "space", label: "Space" }, { value: "inodes", label: "Files" }];

/** /repos/[facility]/[name]/storage/[allocationid] — replaces legacy storage.jsx. */
export function StorageAllocationPage({ allocationid }) {
  return (
    <ClientOnly fallback={<DetailSkeleton />}>
      <StorageAllocationLive allocationid={allocationid} />
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
      <div className="tw:grid tw:grid-cols-2 tw:gap-8">
        <Skeleton className="tw:h-1.5 tw:w-full" />
        <Skeleton className="tw:h-1.5 tw:w-full" />
      </div>
      <ChartSkeleton />
    </div>
  );
}

function StorageAllocationLive({ allocationid }) {
  const { repo } = useRepo();
  const [yearRaw, setYear] = useQueryParam("year", String(thisYear));
  const year = YEARS.some((y) => y.value === yearRaw) ? Number(yearRaw) : thisYear;
  const detail = useStorageAllocationDetail(allocationid, year);
  if (!repo || (detail.loading && !detail.alloc)) return <DetailSkeleton />;
  if (detail.error && !detail.alloc) return <ErrorAlert className="tw:mt-6" error={detail.error} onRetry={detail.refetch} what="storage allocation" />;
  if (detail.notFound)
    return (
      <EmptyState
        className="tw:mt-6"
        icon={FileQuestion}
        title="Allocation not found"
        description={`This allocation doesn’t belong to ${repo.facility}/${repo.name} or no longer exists.`}
        actions={<Button asChild size="sm" variant="outline"><Link href={routes.repo(repo.facility, repo.name, "storage")}>Back to storage</Link></Button>}
      />
    );
  return <StorageAllocationBody repo={repo} detail={detail} year={year} setYear={setYear} />;
}

function StorageAllocationBody({ repo, detail, year, setYear }) {
  const { can } = useViewer();
  const access = storageAccess(repo, can);
  const { dialog, openDialog, closeDialog } = useDialogParam();
  const [metricRaw, setMetric] = useQueryParam("metric", "space");
  const metric = metricRaw === "inodes" ? "inodes" : "space";
  const a = detail.alloc;
  const s = describeStorage(a);

  return (
    <div className="tw:flex tw:flex-col tw:gap-5 tw:pt-6">
      <DetailHeader
        backHref={routes.repo(repo.facility, repo.name, "storage")}
        backLabel="Storage"
        title={<>{a.purpose} <span className="tw:font-mono tw:text-lg tw:font-medium tw:text-muted-foreground">on {a.storagename}</span></>}
        meta={
          a.rootfolder ? (
            <span className="tw:flex tw:items-center tw:gap-1">
              <span className="tw:font-mono tw:text-muted-strong">{a.rootfolder}</span>
              <CopyButton value={a.rootfolder} label="Copy path" />
            </span>
          ) : null
        }
        action={
          <>
            <Button asChild variant="ghost" size="sm"><Link href={routes.storage(a.storagename, a.purpose)}>Storage usage →</Link></Button>
            {access.any && <Button variant="outline" size="sm" onClick={() => openDialog("storage-allocation", a.Id)}>{access.label}</Button>}
          </>
        }
      />

      <div className="tw:grid tw:grid-cols-[1fr_360px] tw:gap-5">
        <SectionCard title="Usage" bodyClassName="tw:flex tw:flex-col tw:gap-5 tw:pt-1">
          <UsageMeter type="storage" label="Space" value={s.spaceText} pct={s.spacePct} ariaLabel={`${a.purpose} storage used ${formatPct(s.spacePct)} of allocation`} />
          {a.inodes ? (
            <UsageMeter type="storage" label="Files (inodes)" value={s.inodeText} pct={s.inodePct} ariaLabel={`Files used ${formatPct(s.inodePct)} of inode quota`} />
          ) : (
            <div className="tw:flex tw:justify-between tw:text-[13px] tw:font-medium" title="No inode quota recorded">
              <span>Files (inodes)</span>
              <span className="tw:text-muted-foreground">{s.usedInodes ? `${formatCount(s.usedInodes)} · no quota` : "—"}</span>
            </div>
          )}
        </SectionCard>
        <SectionCard title="Details">
          <DefinitionList
            className="tw:grid-cols-[110px_1fr]"
            items={[
              { term: "Allocated", value: formatStorage(a.gigabytes) },
              { term: "Used", value: formatStorage(s.usedGb) },
              { term: "Remaining", value: s.spacePct == null ? null : formatPct(Math.max(0, 100 - s.spacePct)) },
              { term: "Start", value: formatDate(a.start) },
              { term: "End", value: formatDate(a.end) },
            ]}
          />
        </SectionCard>
      </div>

      <SectionCard
        title={metric === "inodes" ? `Files used per day · ${year}` : `Space used per day · ${year}`}
        caption="Daily storage rollup; the dashed line is the current allocation."
        action={
          <div className="tw:flex tw:items-center tw:gap-2">
            <Segmented label="Metric" size="sm" items={METRICS} value={metric} onChange={(v) => setMetric(v)} />
            <Segmented label="Year" size="sm" items={YEARS} value={String(year)} onChange={(v) => setYear(v)} />
          </div>
        }
        bodyClassName="tw:flex tw:flex-col tw:gap-3.5"
      >
        {detail.error ? (
          <ErrorAlert error={detail.error} onRetry={detail.refetch} what="storage usage" />
        ) : detail.loading ? (
          <ChartSkeleton />
        ) : detail.series.length ? (
          <StorageUsageChart rows={detail.series} metric={metric} allocated={metric === "inodes" ? a.inodes : a.gigabytes} />
        ) : (
          <p className="tw:flex tw:h-[240px] tw:items-center tw:justify-center tw:text-[13px] tw:text-muted-foreground">No daily storage usage recorded in {year}.</p>
        )}
      </SectionCard>

      {access.any && (
        <StorageAllocationDialog
          open={dialog === "storage-allocation"}
          onClose={closeDialog}
          allocation={a}
          allocations={[a]}
          onTarget={() => {}}
          repo={repo}
          access={access}
        />
      )}
    </div>
  );
}
