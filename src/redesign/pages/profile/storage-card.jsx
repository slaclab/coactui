"use client";

import { Fragment } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MeterBar, meterStatus, SectionCard, Skeleton, STATUS_TEXT, StatusPill } from "../../kit";
import { formatPct, formatStoragePair } from "../../lib/format";
import { useDialogParam } from "../../lib/navigation";

function StorageBlock({ storage, pending, onRequest }) {
  const used = storage.usage?.gigabytes ?? 0;
  const pct = storage.gigabytes > 0 ? (used / storage.gigabytes) * 100 : 0;
  const status = meterStatus("storage", pct);
  return (
    <div className="tw:flex tw:flex-col tw:gap-1.5">
      <div className="tw:flex tw:justify-between tw:gap-3 tw:text-[13px] tw:leading-4.5">
        <span>
          {storage.purpose} · <span className="tw:font-mono">{storage.storagename}</span>
        </span>
        <span className={cn("tw:font-medium tw:tabular-nums", STATUS_TEXT[status])}>{formatStoragePair(used, storage.gigabytes)}</span>
      </div>
      <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={`${storage.purpose} on ${storage.storagename}: ${formatPct(pct)} used`}>
        <MeterBar pct={pct} status={status} className="tw:h-2 tw:w-full" />
      </div>
      <div className="tw:flex tw:min-h-7 tw:items-center tw:justify-between tw:gap-3">
        <span className="tw:truncate tw:font-mono tw:text-xs tw:text-muted-foreground" title={storage.rootfolder}>{storage.rootfolder}</span>
        {pending ? (
          <StatusPill tone="warn" title={`${pending.gigabytes} GB requested`}>Request pending</StatusPill>
        ) : (
          <Button variant="ghost" size="sm" className="tw:-mr-2 tw:h-7" onClick={onRequest}>Request more</Button>
        )}
      </div>
    </div>
  );
}

export function StorageCard({ me, loading, pendingQuotaFor }) {
  const { openDialog } = useDialogParam();
  const storages = me?.storages ?? [];
  return (
    <SectionCard title="Personal storage" bodyClassName="tw:flex tw:flex-col tw:gap-3.5">
      {loading ? (
        <div className="tw:flex tw:flex-col tw:gap-2">
          <Skeleton className="tw:h-4 tw:w-32" />
          <Skeleton className="tw:h-2 tw:w-full" />
        </div>
      ) : storages.length ? (
        storages.map((s, i) => (
          <Fragment key={s.Id}>
            {i > 0 && <div className="tw:h-px tw:bg-border" />}
            <StorageBlock storage={s} pending={pendingQuotaFor(s.storagename, s.purpose)} onRequest={() => openDialog("request-quota", s.Id)} />
          </Fragment>
        ))
      ) : (
        <p className="tw:text-[13px] tw:text-muted-foreground">No personal storage allocated</p>
      )}
    </SectionCard>
  );
}
