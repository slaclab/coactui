"use client";

import Link from "next/link";

import { ErrorAlert, SectionCard, Skeleton } from "../../kit";
import { formatDate } from "../../lib/format";
import { routes } from "../../lib/routes";
import { useViewer } from "../../providers/viewer";

const shortDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en", { month: "short", day: "numeric" });
};

/** The 3 newest account events (same merged timeline as /myaudittrail). */
export function RecentChangesCard({ events }) {
  const { viewer } = useViewer();
  const { rows, loading, error, refetch } = events;
  const recent = rows.slice(0, 3);
  return (
    <SectionCard
      title="Recent account changes"
      action={<Link href={routes.auditTrail()} className="tw:text-[13px] tw:font-medium tw:text-foreground tw:no-underline tw:hover:underline">View all →</Link>}
      bodyClassName="tw:flex tw:flex-col tw:gap-3"
    >
      <ErrorAlert error={error} onRetry={refetch} what="account changes" />
      {loading ? (
        Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="tw:flex tw:flex-col tw:gap-1.5">
            <Skeleton className="tw:h-4 tw:w-56" />
            <Skeleton className="tw:h-3 tw:w-24" />
          </div>
        ))
      ) : recent.length ? (
        recent.map((e) => (
          <div key={e.id} className="tw:flex tw:min-w-0 tw:flex-col">
            <span className="tw:truncate tw:text-[13px] tw:leading-5" title={e.details ? `${e.label} · ${e.details}` : e.label}>
              {e.label}
              {e.details && <span className="tw:font-mono tw:text-xs tw:text-muted-foreground"> · {e.details}</span>}
            </span>
            <span className="tw:text-xs tw:text-muted-foreground" title={formatDate(e.at, { time: true })}>
              by {e.by && e.by === viewer?.username ? "you" : <span className="tw:font-mono">{e.by ?? "system"}</span>} · {shortDate(e.at)}
            </span>
          </div>
        ))
      ) : (
        !error && <p className="tw:text-[13px] tw:text-muted-foreground">No account changes recorded yet</p>
      )}
    </SectionCard>
  );
}
