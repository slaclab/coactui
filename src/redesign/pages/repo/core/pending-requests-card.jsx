"use client";

import Link from "next/link";
import { useQuery } from "@apollo/client";
import { ArrowRight } from "lucide-react";

import { ErrorAlert, SectionCard, StatusPill } from "../../../kit";
import { formatAge } from "../../../lib/format";
import { routes } from "../../../lib/routes";
import { REPO_PENDING_REQUESTS, requestFilter } from "./queries";
import { requestSummary } from "./history-model";

const ago = (v) => {
  const a = formatAge(v);
  return /^\d+[mhd]$/.test(a) ? `${a} ago` : a;
};

/** Overview "Pending requests" (hidden when there are none, as in Paper). */
export function PendingRequestsCard({ repo }) {
  const { data, error, refetch } = useQuery(REPO_PENDING_REQUESTS, { variables: { rf: requestFilter(repo) } });
  if (error) return <ErrorAlert error={error} onRetry={refetch} what="pending requests" />;
  const rows = data?.requests ?? [];
  if (!rows.length) return null;
  const canReview = rows.some((r) => r.canapprove);
  return (
    <SectionCard
      title="Pending requests"
      bodyClassName="tw:px-0 tw:pb-0"
      action={
        canReview && (
          <Link href={routes.requests({ reponame: repo.name, facilityname: repo.facility })} className="tw:flex tw:items-center tw:gap-1 tw:text-[13px] tw:font-medium tw:text-foreground tw:underline tw:underline-offset-2">
            Review in Requests <ArrowRight className="tw:size-3.5" />
          </Link>
        )
      }
    >
      <ul className="tw:divide-y tw:border-t">
        {rows.map((r) => {
          const s = requestSummary(r);
          return (
            <li key={r.Id} className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:px-5 tw:py-2.5">
              <div className="tw:min-w-0">
                <div className="tw:truncate tw:text-[13px]">{s.kind}{s.what ? ` · ${s.what}` : ""}</div>
                <div className="tw:text-xs tw:text-muted-foreground"><span className="tw:font-mono">{r.requestedby}</span> · {ago(r.timeofrequest)}</div>
              </div>
              <StatusPill tone="warn" dot={false}>Pending</StatusPill>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
