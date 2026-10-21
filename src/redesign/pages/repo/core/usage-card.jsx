"use client";

import { cn } from "@/lib/utils";
import { ErrorAlert, MeterBar, meterStatus, SectionCard, Skeleton, STATUS_TEXT } from "../../../kit";
import { fmtLongDay } from "../../../lib/dates";
import { formatPct, formatResourceHours, formatStoragePair } from "../../../lib/format";
import { useRepoUsage7d } from "./queries";

/** Overview "Usage · 7d": one meter per compute allocation, then one per storage purpose. */
export function UsageCard({ repo }) {
  const u = useRepoUsage7d(repo);
  return (
    <SectionCard
      title="Usage · 7d"
      action={<span className="tw:pt-0.5 tw:text-xs tw:text-muted-foreground" title={u.anchor ? `7 days through ${fmtLongDay(u.anchor)}` : undefined}>Daily rollup</span>}
    >
      {u.error ? (
        <ErrorAlert error={u.error} onRetry={u.refetch} what="usage" />
      ) : u.loading ? (
        <div className="tw:flex tw:flex-col tw:gap-5 tw:pb-1">
          {[0, 1].map((i) => (
            <div key={i} className="tw:flex tw:flex-col tw:gap-2">
              <div className="tw:flex tw:justify-between"><Skeleton className="tw:h-4 tw:w-16" /><Skeleton className="tw:h-4 tw:w-24" /></div>
              <Skeleton className="tw:h-1.5 tw:w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="tw:flex tw:flex-col tw:gap-4">
          {u.computeRows.length ? (
            u.computeRows.map((c) => {
              const status = meterStatus("compute-used", c.pct, c.burst);
              return (
                <MeterRow
                  key={c.cluster}
                  label={<span className="tw:font-mono">{c.cluster}</span>}
                  value={
                    !c.ready || u.usageLoading ? (
                      <Skeleton className="tw:h-4 tw:w-24" />
                    ) : (
                      <span className={cn(status && STATUS_TEXT[status])}>{formatPct(c.pct)} · {formatResourceHours(c.used)}</span>
                    )
                  }
                  pct={c.ready ? c.pct : 0}
                  status={status}
                  label2={`${repo.name} used ${Math.round(c.pct)}% of its ${c.cluster} allocation over 7 days`}
                />
              );
            })
          ) : (
            <p className="tw:text-[13px] tw:text-muted-foreground">No compute allocated</p>
          )}
          <hr className="tw:border-border" />
          {u.storageRows.length ? (
            u.storageRows.map((s) => {
              const pct = (s.usedGb / s.allocatedGb) * 100;
              const status = meterStatus("storage", pct);
              return (
                <MeterRow
                  key={s.id}
                  label={<>{s.purpose} · <span className="tw:font-mono">{s.storagename}</span></>}
                  value={<span className={cn(status && STATUS_TEXT[status])}>{formatStoragePair(s.usedGb, s.allocatedGb)}</span>}
                  pct={pct}
                  status={status}
                  label2={`${s.purpose} storage ${formatStoragePair(s.usedGb, s.allocatedGb)} used`}
                />
              );
            })
          ) : (
            <p className="tw:text-[13px] tw:text-muted-foreground">No storage allocated</p>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function MeterRow({ label, value, pct, status, label2 }) {
  return (
    <div className="tw:flex tw:flex-col tw:gap-2">
      <div className="tw:flex tw:items-baseline tw:justify-between tw:gap-3 tw:text-[13px]">
        <span className="tw:min-w-0 tw:truncate">{label}</span>
        <span className="tw:shrink-0 tw:tabular-nums">{value}</span>
      </div>
      <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={label2}>
        <MeterBar pct={pct} status={status} className="tw:h-2 tw:w-full" />
      </div>
    </div>
  );
}
