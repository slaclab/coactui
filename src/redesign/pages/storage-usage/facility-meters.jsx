"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ErrorAlert, MeterBar, meterStatus, SectionCard, Skeleton, STATUS_TEXT } from "../../kit";
import { formatPct, formatStorage, formatStoragePair } from "../../lib/format";
import { routes } from "../../lib/routes";

/** "Used of purchased, by facility" (Paper 49K-0): one full-width meter per purchasing facility. */
export function FacilityMeters({ rows, loading, error, onRetry, storagename, purpose }) {
  return (
    <SectionCard
      title="Used of purchased, by facility"
      action={<span className="tw:text-xs tw:leading-5.5 tw:text-muted-foreground">Amber at 80% · red at 95%</span>}
      bodyClassName="tw:pb-4.5"
    >
      {error ? (
        <ErrorAlert error={error} onRetry={onRetry} what="purchases" />
      ) : loading ? (
        <div className="tw:flex tw:flex-col tw:gap-3" aria-label="Loading purchases">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="tw:flex tw:items-center tw:gap-3.5">
              <Skeleton className="tw:h-4 tw:w-16 tw:shrink-0" />
              <Skeleton className="tw:h-2 tw:grow" />
              <Skeleton className="tw:h-4 tw:w-28 tw:shrink-0" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="tw:py-4 tw:text-center tw:text-[13px] tw:text-muted-foreground">
          No facility has purchased <span className="tw:font-mono">{storagename}</span>{purpose ? ` · ${purpose}` : ""}
        </p>
      ) : (
        <ul className="tw:flex tw:flex-col tw:gap-3">
          {rows.map((r) => (
            <FacilityMeterRow key={r.facility} row={r} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function FacilityMeterRow({ row: r }) {
  const pct = r.pct ?? 0;
  const status = meterStatus("storage", pct);
  const overAllocated = r.allocated > r.purchased;
  const pair = `${formatStoragePair(r.used, r.purchased)} · ${formatPct(pct)}`;
  return (
    <li className="tw:flex tw:items-center tw:gap-3.5">
      <Link href={routes.facility(r.facility)} className="tw:w-20 tw:shrink-0 tw:truncate tw:text-[13px] tw:leading-5 tw:font-medium tw:text-foreground tw:no-underline tw:hover:underline">
        {r.facility}
      </Link>
      <div className="tw:flex tw:grow" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={`${r.facility} used ${pair}`}>
        <MeterBar pct={pct} status={status} className="tw:h-2 tw:w-auto tw:grow tw:shadow-[inset_0_0_0_1px_var(--border)]" />
      </div>
      <div className="tw:flex tw:w-44 tw:shrink-0 tw:flex-col tw:items-end">
        <span className={cn("tw:text-[13px] tw:leading-5 tw:font-medium tw:tabular-nums", STATUS_TEXT[status] ?? "tw:text-foreground")}>{pair}</span>
        {overAllocated && (
          <span className="tw:text-xs tw:text-crit-text tw:tabular-nums" title="More is allocated to repos than the facility purchased">
            allocated {formatStorage(r.allocated)}
          </span>
        )}
      </div>
    </li>
  );
}
