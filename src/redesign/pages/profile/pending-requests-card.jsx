"use client";

import Link from "next/link";

import { ErrorAlert, SectionCard, StatusPill } from "../../kit";
import { formatAge, formatDate } from "../../lib/format";
import { routes } from "../../lib/routes";
import { pendingTitle, statusPill } from "./audit-labels";

// formatAge gives "3d" / "just now" / a date; only the short form takes "ago".
const ago = (v) => {
  const a = formatAge(v);
  return /^\d+[mhd]$/.test(a) ? `${a} ago` : a;
};

/** Open requests (one ProfileRequests query feeds this and the in-card pending states). */
export function PendingRequestsCard({ requests }) {
  const { pending, loading, error, refetch } = requests;
  if (loading || (!error && !pending.length)) return null;
  return (
    <SectionCard
      title="Pending requests"
      caption={error ? undefined : `${pending.length} open`}
      bodyClassName="tw:flex tw:flex-col tw:gap-3"
      footer={<Link href={routes.requests({ view: "mine" })} className="tw:text-[13px] tw:font-medium tw:text-foreground tw:no-underline tw:hover:underline">View in Requests →</Link>}
    >
      {error ? (
        <ErrorAlert error={error} onRetry={refetch} what="your requests" />
      ) : (
        pending.map((r) => {
          const pill = statusPill(r.approvalstatus);
          return (
            <div key={r.Id} className="tw:flex tw:items-center tw:justify-between tw:gap-3">
              <div className="tw:flex tw:min-w-0 tw:flex-col">
                <span className="tw:truncate tw:text-[13px] tw:leading-5">{pendingTitle(r)}</span>
                <span className="tw:text-xs tw:text-muted-foreground" title={formatDate(r.timeofrequest, { time: true })}>
                  {ago(r.timeofrequest)}
                </span>
              </div>
              <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
            </div>
          );
        })
      )}
    </SectionCard>
  );
}
