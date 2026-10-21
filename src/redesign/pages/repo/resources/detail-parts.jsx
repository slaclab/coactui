"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "../../../kit";

/** Sub-header of an allocation detail page inside the repo layout: "← Compute", title, action. */
export function DetailHeader({ backHref, backLabel, title, meta, action }) {
  return (
    <div className="tw:flex tw:items-end tw:justify-between tw:gap-6">
      <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1.5">
        <Link href={backHref} className="tw:flex tw:w-fit tw:items-center tw:gap-1 tw:text-[13px] tw:font-medium tw:text-muted-foreground tw:no-underline tw:hover:text-foreground">
          <ArrowLeft className="tw:size-3.5" /> {backLabel}
        </Link>
        <h2 className="tw:truncate tw:text-xl tw:leading-7 tw:font-semibold">{title}</h2>
        {meta && <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-3 tw:gap-y-1 tw:text-[13px] tw:text-muted-foreground">{meta}</div>}
      </div>
      {action && <div className="tw:flex tw:shrink-0 tw:items-center tw:gap-2">{action}</div>}
    </div>
  );
}

/** Row of small stat cards: items = [{ label, value, sub? }]. */
export function StatCards({ items, loading }) {
  return (
    <dl className="tw:grid tw:grid-cols-2 tw:gap-4 tw:md:grid-cols-5">
      {items.map((it) => (
        <div key={it.label} className="tw:flex tw:flex-col tw:gap-1 tw:rounded-xl tw:border tw:bg-background tw:px-4 tw:py-3.5">
          <dt className="tw:text-xs tw:text-muted-foreground">{it.label}</dt>
          <dd className="tw:text-lg tw:leading-6.5 tw:font-semibold tw:tabular-nums">{loading ? <Skeleton className="tw:my-1 tw:h-4 tw:w-20" /> : it.value ?? <span className="tw:text-muted-foreground">—</span>}</dd>
          {it.sub && !loading && <dd className="tw:text-xs tw:text-muted-foreground">{it.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}

export function ChartSkeleton() {
  return <div className="tw:h-[264px] tw:animate-pulse tw:rounded-lg tw:bg-muted/60" aria-label="Loading usage" />;
}
