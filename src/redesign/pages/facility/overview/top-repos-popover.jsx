"use client";

import Link from "next/link";
import { List } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ErrorAlert, Skeleton } from "../../../kit";
import { formatInt, formatPct } from "../../../lib/format";
import { routes } from "../../../lib/routes";
import { useFacility } from "../facility-context";
import { useSharedRepoShares } from "../queries";

const MAX_ROWS = 8;
// Spec decision 17: nodes = purchase × share / 100.
const nodes = (purchased, pct) => {
  const n = (purchased * pct) / 100;
  return Number.isInteger(n) || n >= 10 ? formatInt(Math.round(n)) : n.toFixed(1);
};

/** "Top repos" icon button + popover: the cluster's largest repo shares of the purchase. */
export function TopReposPopover({ facility, cluster, purchased }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Top repos on ${cluster}`}
        title="Top repos"
        className="tw:flex tw:size-8 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-sm tw:text-foreground tw:hover:bg-muted tw:data-[state=open]:bg-muted"
      >
        <List className="tw:size-3.75" />
      </PopoverTrigger>
      <PopoverContent align="start" className="tw:w-80 tw:p-0">
        <SharesList facility={facility} cluster={cluster} purchased={purchased} />
      </PopoverContent>
    </Popover>
  );
}

// Mounted only while the popover is open; czars/admins reuse the layout's shares, read-only
// viewers fetch on demand.
function SharesList({ facility, cluster, purchased }) {
  const { shares } = useFacility();
  const { byCluster, loading, error, refetch } = useSharedRepoShares(shares, facility);
  const list = byCluster[cluster] ?? [];
  const total = list.reduce((t, s) => t + s.pct, 0);
  const rest = 100 - total;
  const row = "tw:flex tw:h-7.5 tw:items-center tw:gap-2 tw:px-4 tw:text-[13px] tw:tabular-nums";
  return (
    <div className="tw:flex tw:flex-col tw:py-1.5">
      <div className="tw:flex tw:h-7 tw:items-center tw:justify-between tw:px-4 tw:text-[13px]">
        <span className="tw:font-semibold">{cluster} · repo shares</span>
        <span className="tw:text-xs tw:text-muted-foreground">of {formatInt(purchased)} nodes</span>
      </div>
      {loading ? (
        Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={row}>
            <Skeleton className="tw:h-4 tw:w-36" />
            <Skeleton className="tw:ml-auto tw:h-4 tw:w-10" />
          </div>
        ))
      ) : error ? (
        <ErrorAlert error={error} onRetry={refetch} what="repo shares" className="tw:mx-3 tw:my-2" />
      ) : !list.length ? (
        <p className="tw:px-4 tw:py-4 tw:text-[13px] tw:text-muted-foreground">No repos allocated on {cluster}</p>
      ) : (
        <>
          {list.slice(0, MAX_ROWS).map((s) => (
            <div key={s.repo} className={row}>
              <Link href={routes.repo(facility, s.repo)} className="tw:min-w-0 tw:flex-1 tw:truncate tw:font-mono tw:text-foreground tw:no-underline tw:hover:underline">{s.repo}</Link>
              <span className="tw:w-12 tw:text-right tw:font-medium">{formatPct(s.pct)}</span>
              <span className="tw:w-19 tw:text-right tw:text-muted-foreground">{nodes(purchased, s.pct)} nodes</span>
            </div>
          ))}
          {list.length > MAX_ROWS && <div className="tw:px-4 tw:text-xs tw:text-muted-foreground">+{list.length - MAX_ROWS} more repos</div>}
          <div className={cn(row, "tw:mt-1 tw:h-8.5 tw:border-t tw:pt-1")}>
            {rest >= 0 ? (
              <>
                <span className="tw:flex-1 tw:text-muted-foreground">Unallocated</span>
                <span className="tw:w-12 tw:text-right">{formatPct(rest)}</span>
                <span className="tw:w-19 tw:text-right tw:text-muted-foreground">{nodes(purchased, rest)} nodes</span>
              </>
            ) : (
              <>
                <span className="tw:flex-1 tw:font-medium tw:text-crit-text">Oversubscribed</span>
                <span className="tw:text-right tw:font-medium tw:text-crit-text">+{formatPct(-rest)}</span>
                <span className="tw:w-19 tw:text-right tw:text-crit-text">{nodes(purchased, -rest)} nodes</span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
