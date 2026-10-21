"use client";

import Link from "next/link";
import { formatAge } from "../../../lib/format";
import { routes } from "../../../lib/routes";

/**
 * Warn-tone banner for a pending allocation request on a compute or storage block:
 * "Pending request · 8 → 13 TB · jdoe · 2 days ago   Review in Requests →".
 */
export function PendingRequestBanner({ request, change, canReview, facility, repoName }) {
  if (!request) return null;
  const age = formatAge(request.timeofrequest);
  return (
    <div className="tw:flex tw:items-center tw:justify-between tw:gap-4 tw:rounded-lg tw:border tw:border-warn/30 tw:bg-warn-bg tw:px-3.5 tw:py-2.5 tw:text-[13px]">
      <span className="tw:flex tw:items-center tw:gap-2">
        <span className="tw:size-1.5 tw:shrink-0 tw:rounded-full tw:bg-warn" aria-hidden />
        <span>
          Pending request{change ? <> · {change}</> : null}
          {request.requestedby && <> · <span className="tw:font-mono">{request.requestedby}</span></>}
          {age !== "—" && <> · {/^\d/.test(age) && !age.includes(",") ? `${age} ago` : age}</>}
        </span>
      </span>
      {canReview && (
        <Link href={routes.requests({ facilityname: facility, reponame: repoName, reqtype: request.reqtype })} className="tw:shrink-0 tw:font-semibold tw:text-primary-text tw:underline tw:underline-offset-2">
          Review in Requests →
        </Link>
      )}
    </div>
  );
}
