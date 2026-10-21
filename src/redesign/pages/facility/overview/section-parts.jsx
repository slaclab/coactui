"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "../../../kit";

/**
 * SectionCard body classes that let a kit DataTable (footer={false}, no toolbar) sit flush in
 * the card, edge to edge, as in Paper. Kit request: a DataTable `variant="embedded"`.
 */
export const FLUSH_TABLE_BODY = "tw:px-0 tw:pb-0 tw:[&>div>div]:rounded-none tw:[&>div>div]:border-x-0 tw:[&>div>div]:border-b-0";

/**
 * Card-head "+ Add … purchase" (spec §8 Purchase actions): enabled for admins; czars see it
 * disabled with the reason beside it; hidden for read-only viewers (render nothing).
 */
export function AddPurchaseButton({ label, gate, onClick }) {
  return (
    <div className="tw:flex tw:shrink-0 tw:items-center tw:gap-2.5">
      {gate && <span className="tw:text-xs tw:text-muted-foreground">{gate}</span>}
      <Button variant="outline" size="sm" disabled={!!gate} onClick={onClick}>
        <Plus /> {label}
      </Button>
    </div>
  );
}

/** Server/hydration skeleton of one Overview card (rendered outside <ClientOnly>). */
export function CardSkeleton({ title, rows = 3, className }) {
  return (
    <section className={cn("tw:flex tw:flex-col tw:rounded-xl tw:border tw:bg-background", className)}>
      <div className="tw:px-5 tw:pt-4.5 tw:pb-3">
        <h2 className="tw:text-[15px] tw:leading-5.5 tw:font-semibold">{title}</h2>
      </div>
      <div className="tw:h-9 tw:border-y tw:bg-muted/60" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="tw:flex tw:h-13 tw:items-center tw:gap-6 tw:border-b tw:px-5 tw:last:border-b-0">
          <Skeleton className="tw:h-4 tw:w-40" />
          <Skeleton className="tw:h-4 tw:w-10" />
          <Skeleton className="tw:h-1.5 tw:w-20" />
        </div>
      ))}
    </section>
  );
}
