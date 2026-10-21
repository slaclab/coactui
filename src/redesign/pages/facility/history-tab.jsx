"use client";

import { useMemo } from "react";
import { History, Info } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState, ErrorAlert, Skeleton, Timeline } from "../../kit";
import { useClusters } from "../../data/clusters";
import { formatDate } from "../../lib/format";
import { ClientOnly } from "../../providers/apollo";
import { useFacility } from "./facility-context";
import { diffPurchaseHistory } from "./history";
import { usePurchaseHistory } from "./queries";

/** /facilities/[name]/history — compute purchase changes (czar/admin; spec §5 Other tabs). */
export function FacilityHistoryTab() {
  return (
    <div className="tw:flex tw:max-w-[880px] tw:flex-col tw:gap-6">
      <Alert className="tw:bg-background">
        <Info />
        <AlertDescription className="tw:text-[13px] tw:text-muted-strong">
          Shows compute purchase changes. Czar, description and storage purchase changes are not recorded yet.
        </AlertDescription>
      </Alert>
      <ClientOnly fallback={<TimelineSkeleton />}>
        <HistoryLive />
      </ClientOnly>
    </div>
  );
}

function HistoryLive() {
  const { name, canManage, viewerLoading } = useFacility();
  if (viewerLoading) return <TimelineSkeleton />;
  if (!canManage) return <EmptyState icon={History} title="History is visible to facility czars" description={`Ask a ${name} czar or a Coact admin.`} />;
  return <HistoryTimeline name={name} />;
}

function HistoryTimeline({ name }) {
  const { records, loading, error, refetch } = usePurchaseHistory(name);
  const { clusters } = useClusters();
  const entries = useMemo(() => diffPurchaseHistory(records, clusters), [records, clusters]);
  if (loading) return <TimelineSkeleton />;
  if (error) return <ErrorAlert error={error} onRetry={refetch} what="purchase history" />;
  if (!entries.length) return <EmptyState icon={History} title="No compute purchase changes recorded" description={`Changes to ${name}'s compute purchases will appear here.`} />;
  return (
    <Timeline
      entries={entries.map((e) => ({
        key: e.key,
        title: (
          <>
            <span className="tw:font-mono tw:font-medium">{e.actor}</span>
            <span>{e.verb} {e.cluster} purchase</span>
          </>
        ),
        meta: (
          <span className="tw:flex tw:flex-col tw:gap-0.5">
            <span className="tw:font-mono tw:text-muted-strong">{e.change}</span>
            <span>{formatDate(e.time, { time: true })}{e.first ? " · first recorded" : ""}</span>
          </span>
        ),
      }))}
    />
  );
}

function TimelineSkeleton() {
  return (
    <ol className="tw:ml-2 tw:space-y-5 tw:border-l tw:pl-6" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="tw:flex tw:flex-col tw:gap-1.5">
          <Skeleton className="tw:h-4 tw:w-56" />
          <Skeleton className="tw:h-3 tw:w-40" />
          <Skeleton className="tw:h-3 tw:w-24" />
        </li>
      ))}
    </ol>
  );
}
