"use client";

import Link from "next/link";
import { History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader, Skeleton } from "../../kit";
import { formatDate } from "../../lib/format";
import { routes } from "../../lib/routes";

function initials(me) {
  const source = me?.fullname?.trim() || me?.username || "";
  const parts = source.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts.at(-1)[0] : source.slice(0, 2)).toUpperCase();
}

/** 56px initials avatar (Paper "Profile header"). */
function Avatar({ me, loading }) {
  return (
    <div className="tw:flex tw:size-14 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-muted" aria-hidden>
      {loading ? null : <span className="tw:text-xl tw:font-semibold tw:text-muted-strong">{initials(me)}</span>}
    </div>
  );
}

/**
 * Avatar + PageHeader. PageHeader has no `leading` slot yet (kit request), so the avatar
 * sits beside it in a flex row; PageHeader keeps its own title/subtitle/actions layout.
 */
export function ProfileHeader({ me, loading }) {
  const subtitle = loading ? (
    <Skeleton className="tw:mt-1 tw:h-4 tw:w-72" />
  ) : me ? (
    <>
      <span className="tw:font-mono">{me.username}</span>
      {me.uidnumber != null && <> · UID <span className="tw:tabular-nums">{me.uidnumber}</span></>}
      {me.earliestCompletedUserAccountRegistration && <> · SDF user since {formatDate(me.earliestCompletedUserAccountRegistration)}</>}
      {me.facilities?.length > 0 && <> · {me.facilities.join(" · ")}</>}
    </>
  ) : null;

  return (
    <div className="tw:flex tw:items-center tw:gap-4">
      <Avatar me={me} loading={loading} />
      <PageHeader
        className="tw:min-w-0 tw:flex-1"
        title={loading ? <Skeleton className="tw:h-7 tw:w-40" /> : (me?.fullname || me?.username || "My profile")}
        subtitle={subtitle}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={routes.auditTrail()} className="tw:no-underline">
              <History className="tw:size-3.5 tw:text-muted-strong" />
              My audit trail
            </Link>
          </Button>
        }
      />
    </div>
  );
}
