"use client";

import Link from "next/link";
import { ErrorAlert, SectionCard, Skeleton } from "../../../../kit";
import { routes } from "../../../../lib/routes";
import { useFeatureHistory } from "../queries";

const STEPS = [
  "Saved straight to the repo, and logged as an audit entry and a RepoUpdateFeature request.",
  "Nothing is provisioned right away: coactd does not act on feature requests, so in Requests they end up Incomplete or stay Approved.",
  "The new values are used the next time this repo’s members or compute allocation change.",
];

export function HowChangesApply({ editable }) {
  return (
    <SectionCard title="How a change applies" className="tw:h-full">
      <ol className="tw:flex tw:flex-col tw:gap-3">
        {STEPS.map((s, i) => (
          <li key={i} className="tw:flex tw:gap-3 tw:text-[13px] tw:leading-5">
            <span className="tw:flex tw:size-5 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-muted tw:text-[11px] tw:font-semibold tw:text-muted-strong tw:tabular-nums">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <p className="tw:mt-4 tw:border-t tw:pt-3 tw:text-xs tw:text-muted-foreground">
        {editable ? "Only Coact admins can change features. Czars, PIs and members see this tab read-only." : "Only Coact admins can change features."}
      </p>
    </SectionCard>
  );
}

const shortDay = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en", { month: "short", day: "2-digit" });
};

/** Latest feature entries from repoAuditTrails. details is free text, shown raw. */
export function RecentFeatureChanges({ facility, name }) {
  const h = useFeatureHistory(3);
  return (
    <SectionCard
      title="Recent feature changes"
      className="tw:h-full"
      action={<Link href={routes.repo(facility, name, "history")} className="tw:text-[13px] tw:font-medium tw:text-primary-text tw:no-underline tw:hover:underline">All history →</Link>}
    >
      {h.error ? (
        <ErrorAlert error={h.error} onRetry={h.refetch} what="feature history" />
      ) : h.loading ? (
        <div className="tw:flex tw:flex-col tw:gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="tw:h-8 tw:w-full" />)}</div>
      ) : h.entries.length === 0 ? (
        <p className="tw:py-4 tw:text-[13px] tw:text-muted-foreground">No feature changes recorded</p>
      ) : (
        <ul className="tw:flex tw:flex-col">
          {h.entries.map((e) => (
            <li key={e.Id} className="tw:flex tw:gap-6 tw:border-b tw:py-3 tw:first:pt-0 tw:last:border-b-0">
              <span className="tw:w-12 tw:shrink-0 tw:font-mono tw:text-xs tw:leading-5 tw:text-muted-strong">{shortDay(e.actedat)}</span>
              <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1">
                <span className="tw:text-[13px] tw:leading-5">
                  {e.action}
                  {e.actedby && <> · by <span className="tw:font-mono">{e.actedby}</span></>}
                </span>
                {e.details && <span className="tw:line-clamp-2 tw:font-mono tw:text-[11px] tw:leading-4 tw:break-all tw:text-muted-strong" title={e.details}>{e.details}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
