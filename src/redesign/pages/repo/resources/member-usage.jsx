"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MeterBar } from "../../../kit";
import { formatInt } from "../../../lib/format";

/** Members by usage (desc), joined with repo members who used nothing. */
export function memberUsageRows(perUserUsage, members = []) {
  const used = new Map();
  for (const u of perUserUsage ?? []) used.set(u.username, (used.get(u.username) ?? 0) + (u.resourceHours ?? 0));
  const total = [...used.values()].reduce((t, v) => t + v, 0);
  const names = new Set([...used.keys(), ...members]);
  return [...names]
    .map((username) => {
      const rh = used.get(username) ?? 0;
      return { username, rh, share: total ? (rh / total) * 100 : 0, member: members.includes(username) };
    })
    .sort((a, b) => b.rh - a.rh || a.username.localeCompare(b.username));
}

/** "Usage by member · this period" — top N bars, then the members with no usage. */
export function MemberUsage({ perUserUsage, members, top = 4, allHref }) {
  const rows = useMemo(() => memberUsageRows(perUserUsage, members), [perUserUsage, members]);
  const active = rows.filter((r) => r.rh > 0);
  const shown = active.slice(0, top);
  const moreActive = active.length - shown.length;
  const idle = rows.length - active.length;
  const max = shown[0]?.rh ?? 0;

  return (
    <div className="tw:flex tw:flex-col tw:gap-3">
      <div className="tw:flex tw:justify-between">
        <h3 className="tw:text-[13px] tw:leading-5 tw:font-semibold">Usage by member · this period</h3>
        <span className="tw:text-xs tw:leading-5 tw:text-muted-foreground">resource-h</span>
      </div>
      {shown.length === 0 ? (
        <p className="tw:text-[13px] tw:text-muted-foreground">No usage recorded this period</p>
      ) : (
        <ul className="tw:flex tw:flex-col tw:gap-3">
          {shown.map((r) => (
            <li key={r.username} className="tw:flex tw:items-center tw:gap-3">
              <span className="tw:w-18 tw:shrink-0 tw:truncate tw:font-mono tw:text-xs" title={r.username}>{r.username}</span>
              <MeterBar pct={max ? (r.rh / max) * 100 : 0} className="tw:w-auto tw:grow" />
              <span className="tw:w-14 tw:shrink-0 tw:text-right tw:text-xs tw:tabular-nums">{formatInt(Math.round(r.rh))}</span>
            </li>
          ))}
        </ul>
      )}
      {(moreActive > 0 || idle > 0) && (
        <p className="tw:text-xs tw:text-muted-foreground">
          {moreActive > 0 && <>{moreActive} more {moreActive === 1 ? "member" : "members"} with usage{idle > 0 ? " · " : ""}</>}
          {idle > 0 && <>{moreActive > 0 ? idle : `${idle} more`} {idle === 1 ? "member" : "members"} with no usage this period</>}
          {allHref && moreActive > 0 && (
            <>
              {" · "}
              <Link href={allHref} className="tw:font-medium tw:text-foreground tw:underline-offset-2 tw:hover:underline">All members →</Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
