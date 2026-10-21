"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Database } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ActionsMenu, Chip, DataTable, EmptyState, MeterBar, meterStatus, SectionCard, STATUS_TEXT } from "../../../kit";
import { formatPct, formatStorage, formatStoragePair } from "../../../lib/format";
import { useDialogParam } from "../../../lib/navigation";
import { routes } from "../../../lib/routes";
import { useFacility } from "../facility-context";
import { DIALOGS, storageRowActions } from "../facility-actions";
import { AddPurchaseButton, FLUSH_TABLE_BODY } from "./section-parts";

const NUM = "tw:block tw:text-right tw:tabular-nums";
const right = { headerClassName: "tw:text-right", cellClassName: "tw:text-right" };

/** Overview › Storage (spec §5b): purchases per storage/purpose; "Purchased" (was "Acquired"). */
export function StorageSection() {
  const f = useFacility();
  const { facility, loading, canManage } = f;
  const { openDialog } = useDialogParam();
  const rows = useMemo(
    () => [...(facility?.storagepurchases ?? [])].sort((a, b) => a.storagename.localeCompare(b.storagename) || a.purpose.localeCompare(b.purpose)),
    [facility],
  );

  const columns = useMemo(
    () => [
      {
        id: "storage",
        header: "Storage",
        cell: ({ row: { original: p } }) => (
          <Link href={routes.storage(p.storagename)} className="tw:font-mono tw:text-sm tw:font-medium tw:text-foreground tw:no-underline tw:hover:underline">{p.storagename}</Link>
        ),
        size: 150,
        meta: { headerClassName: "tw:pl-5", cellClassName: "tw:pl-5" },
      },
      {
        id: "purpose",
        header: "Purpose",
        cell: ({ row: { original: p } }) => (
          <Link href={routes.storage(p.storagename, p.purpose)} className="tw:no-underline">
            <Chip className="tw:hover:bg-muted">{p.purpose}</Chip>
          </Link>
        ),
        size: 100,
      },
      {
        id: "used",
        header: "Used of purchased",
        cell: ({ row: { original: p } }) => {
          const pct = p.purchased ? ((p.used ?? 0) / p.purchased) * 100 : 0;
          const status = meterStatus("storage", pct);
          return (
            <div className="tw:flex tw:items-center tw:gap-2.5 tw:text-[13px] tw:tabular-nums">
              <span role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={`${p.storagename} ${p.purpose}: ${formatPct(pct)} of purchase used`}>
                <MeterBar pct={pct} status={status} className="tw:w-35" />
              </span>
              {p.used ? (
                <>
                  <span className={cn(status ? cn("tw:font-medium", STATUS_TEXT[status]) : "tw:text-foreground")}>{formatStoragePair(p.used, p.purchased)}</span>
                  <span className={cn(status ? STATUS_TEXT[status] : "tw:text-muted-foreground")}>{formatPct(pct)}</span>
                </>
              ) : (
                <span className="tw:text-muted-foreground" title="No usage reported">— <span className="tw:sr-only">no usage reported</span>of {formatStorage(p.purchased)}</span>
              )}
            </div>
          );
        },
        meta: { cellClassName: "tw:w-full" },
      },
      {
        id: "allocated",
        header: "Allocated",
        cell: ({ row: { original: p } }) =>
          p.allocated > p.purchased ? (
            <span className={cn(NUM, "tw:font-medium tw:text-crit-text")} title="Allocated above purchased">{formatStorage(p.allocated)} !</span>
          ) : (
            <span className={NUM}>{formatStorage(p.allocated ?? 0)}</span>
          ),
        size: 100,
        meta: right,
      },
      {
        id: "headroom",
        header: "Unallocated",
        cell: ({ row: { original: p } }) => {
          const room = p.purchased - (p.allocated ?? 0);
          return room >= 0 ? (
            <span className={cn(NUM, "tw:text-muted-strong")}>{formatStorage(room)}</span>
          ) : (
            <span className={cn(NUM, "tw:font-medium tw:text-crit-text")}>−{formatStorage(-room)}</span>
          );
        },
        size: 130,
        meta: right,
      },
      {
        id: "actions",
        header: () => <span className="tw:sr-only">Actions</span>,
        cell: ({ row: { original: p } }) => (
          <ActionsMenu groups={storageRowActions(f, p)} onDialog={(d, item) => openDialog(d, item.target)} label={`Actions for ${p.storagename} ${p.purpose}`} />
        ),
        size: 48,
        meta: { cellClassName: "tw:px-0 tw:w-12", headerClassName: "tw:w-12" },
      },
    ],
    [f, openDialog],
  );

  const action = canManage ? (
    <AddPurchaseButton label="Add storage purchase" gate={f.purchaseGate} onClick={() => openDialog(DIALOGS.storagePurchase)} />
  ) : (
    <span className="tw:text-[13px] tw:text-muted-foreground">Daily rollup</span>
  );

  if (!loading && !rows.length) {
    return (
      <SectionCard title="Storage" action={action}>
        <EmptyState
          icon={Database}
          title="No storage purchased yet"
          description={f.canEditPurchases ? undefined : "Contact Coact admins to add a purchase."}
          actions={f.canEditPurchases && <Button size="sm" onClick={() => openDialog(DIALOGS.storagePurchase)}>Add storage purchase</Button>}
          className="tw:border-0 tw:py-8"
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Storage" action={action} className="tw:min-w-0 tw:overflow-hidden" bodyClassName={FLUSH_TABLE_BODY}>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(p) => `${p.storagename}/${p.purpose}`}
        loading={loading}
        skeleton={["tw:w-24", "tw:w-12", "tw:w-40", "tw:w-10 tw:ml-auto", "tw:w-10 tw:ml-auto", null]}
        footer={false}
        rowClassName={() => "tw:h-13"}
      />
    </SectionCard>
  );
}
