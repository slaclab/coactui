"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ActionsMenu, MeterBar, meterStatus, Skeleton, STATUS_TEXT } from "../../kit";
import { formatPct, formatStoragePair } from "../../lib/format";
import { fmtLongDay } from "../../lib/dates";
import { routes } from "../../lib/routes";
import { useViewer } from "../../providers/viewer";
import { facilityActions } from "./facility-actions";
import { FacilityMark } from "./facility-mark";
import { HealthBadge } from "./health-badge";

const MAX_ROWS = 3;
const sectionLabel = "tw:text-[11px] tw:leading-4 tw:font-semibold tw:tracking-[0.06em] tw:uppercase tw:text-muted-strong";

/** Card grid (spec F3a): `grid gap-4 md:grid-cols-2 xl:grid-cols-3`. */
export function FacilityGrid({ children }) {
  return <div className="tw:grid tw:gap-4 tw:md:grid-cols-2 tw:xl:grid-cols-3">{children}</div>;
}

/** Usage caption for "Compute · 7d": where the 7d numbers come from. */
export function usageCaption(usage) {
  if (usage.loading) return null;
  if (usage.source === "live") return "Live (jobs)";
  if (usage.source === "rollup") return `Daily rollup${usage.anchor ? ` · through ${fmtLongDay(usage.anchor)}` : ""}`;
  return "No usage data";
}

/** FacilityCard (spec §4): stretched title link; badge and "…" sit above it (z-10). */
export function FacilityCard({ facility: f, usage, pendingLoading }) {
  const { can } = useViewer();
  return (
    <article
      className="tw:relative tw:flex tw:flex-col tw:rounded-xl tw:border tw:bg-background tw:shadow-xs tw:transition-shadow tw:hover:border-ring/30 tw:hover:shadow-md tw:has-[a:focus-visible]:ring-2 tw:has-[a:focus-visible]:ring-ring/40"
    >
      <header className="tw:flex tw:items-center tw:gap-3 tw:pt-4.5 tw:pr-4 tw:pl-4.5">
        <FacilityMark />
        <div className="tw:flex tw:min-w-0 tw:grow tw:flex-col tw:gap-px">
          <Link
            href={routes.facility(f.name)}
            className="tw:truncate tw:text-[17px] tw:leading-5.5 tw:font-bold tw:tracking-[-0.01em] tw:text-foreground tw:no-underline tw:outline-none tw:after:absolute tw:after:inset-0 tw:after:rounded-xl tw:after:content-['']"
          >
            {f.name}
          </Link>
          <span className="tw:truncate tw:text-[13px] tw:leading-4.5 tw:text-muted-foreground" title={f.description || undefined}>
            {f.description || "No description"}
          </span>
        </div>
        <HealthBadge health={f.health} facility={f.name} />
        <ActionsMenu groups={facilityActions(f, can, { context: "card" })} label={`Actions for ${f.name}`} className="tw:relative tw:z-10 tw:size-7" />
      </header>

      <section className="tw:flex tw:flex-col tw:gap-2 tw:px-4.5 tw:pt-4.5" aria-label="Compute, past 7 days">
        <div className="tw:flex tw:items-baseline tw:justify-between">
          <span className={sectionLabel}>Compute · 7d</span>
          {f.compute.length > 0 && <span className="tw:text-xs tw:text-muted-foreground">{usageCaption(usage) ?? <Skeleton className="tw:h-3 tw:w-16" />}</span>}
        </div>
        <ComputeRows facility={f} loading={usage.loading} />
      </section>

      <section className="tw:flex tw:grow tw:flex-col tw:gap-2 tw:px-4.5 tw:pt-3.5 tw:pb-4.5" aria-label="Storage">
        <StorageRow storage={f.storage} />
      </section>

      <CardFooter facility={f} pendingLoading={pendingLoading} />
    </article>
  );
}

function ComputeRows({ facility: f, loading }) {
  if (!f.compute.length) return <p className="tw:text-[13px] tw:text-muted-foreground">No compute purchased</p>;
  const shown = f.compute.slice(0, MAX_ROWS);
  const more = f.compute.length - shown.length;
  return (
    <>
      {shown.map((c) => {
        const status = c.pct == null ? null : meterStatus("compute-used", c.pct, c.burstPercent);
        return (
          <div key={c.cluster} className="tw:flex tw:items-center tw:gap-3">
            <span className="tw:w-14 tw:shrink-0 tw:truncate tw:font-mono tw:text-xs tw:text-muted-strong">{c.cluster}</span>
            {loading ? (
              <Skeleton className="tw:h-2 tw:grow tw:rounded-full" />
            ) : (
              <MeterBar pct={c.pct ?? 0} status={status} className="tw:h-2 tw:w-auto tw:grow tw:basis-0" />
            )}
            <span className={cn("tw:w-10 tw:shrink-0 tw:text-right tw:font-mono tw:text-xs tw:font-medium tw:tabular-nums", STATUS_TEXT[status] ?? "tw:text-foreground")}>
              {loading ? <Skeleton className="tw:ml-auto tw:h-3 tw:w-8" /> : formatPct(c.pct)}
            </span>
          </div>
        );
      })}
      {more > 0 && <span className="tw:text-xs tw:text-muted-foreground">+{more} more</span>}
    </>
  );
}

function StorageRow({ storage }) {
  if (!storage) {
    return (
      <>
        <span className={sectionLabel}>Storage</span>
        <p className="tw:text-[13px] tw:text-muted-foreground">No storage purchased</p>
      </>
    );
  }
  const pct = (storage.usedGb / storage.purchasedGb) * 100;
  const status = meterStatus("storage", pct);
  return (
    <>
      <div className="tw:flex tw:items-baseline tw:justify-between">
        <span className={sectionLabel}>Storage</span>
        <span className="tw:font-mono tw:text-xs tw:text-muted-foreground">{formatStoragePair(storage.usedGb, storage.purchasedGb)}</span>
      </div>
      <div className="tw:flex tw:items-center tw:gap-3">
        <MeterBar pct={pct} status={status} className="tw:h-2 tw:w-auto tw:grow tw:basis-0" />
        <span className={cn("tw:w-10 tw:shrink-0 tw:text-right tw:font-mono tw:text-xs tw:font-medium tw:tabular-nums", STATUS_TEXT[status] ?? "tw:text-foreground")}>{formatPct(pct)}</span>
      </div>
    </>
  );
}

/** "asmith, bwong +1" */
export function czarList(czars, max = 3) {
  if (!czars.length) return "—";
  return czars.length > max ? `${czars.slice(0, max).join(", ")} +${czars.length - max}` : czars.join(", ");
}

function CardFooter({ facility: f, pendingLoading }) {
  return (
    <footer className="tw:flex tw:h-11 tw:shrink-0 tw:items-center tw:justify-between tw:gap-3 tw:border-t tw:px-4.5 tw:text-xs">
      <span className="tw:truncate tw:text-muted-foreground">
        Czars · <span className="tw:font-mono">{czarList(f.czars)}</span>
      </span>
      <span className="tw:flex tw:shrink-0 tw:items-center tw:gap-2">
        <span className="tw:text-muted-strong tw:tabular-nums">{f.repos} repos</span>
        <PendingPill facility={f.name} count={f.pending} loading={pendingLoading} />
      </span>
    </footer>
  );
}

/** Pending requests: warn pill linking to the requests inbox, or muted copy. */
export function PendingPill({ facility, count, loading }) {
  if (loading) return <Skeleton className="tw:h-4 tw:w-10" />;
  if (count == null) return <span className="tw:text-muted-foreground">—</span>;
  if (count === 0) return <span className="tw:text-muted-foreground">No pending requests</span>;
  return (
    <Link
      href={routes.requests({ facilityname: facility })}
      className="tw:relative tw:z-10 tw:flex tw:h-5.5 tw:items-center tw:gap-1 tw:rounded-full tw:bg-warn-bg tw:px-2 tw:text-xs tw:font-semibold tw:text-warn-text tw:no-underline tw:hover:underline"
    >
      <span className="tw:font-mono">{count}</span> pending
    </Link>
  );
}

/** Spec §9: 6 skeleton cards with 3 bar skeletons each. */
export function FacilityCardSkeleton() {
  return (
    <div className="tw:flex tw:flex-col tw:rounded-xl tw:border tw:bg-background tw:shadow-xs" aria-hidden>
      <div className="tw:flex tw:items-center tw:gap-3 tw:pt-4.5 tw:pr-4 tw:pl-4.5">
        <Skeleton className="tw:size-10 tw:rounded-lg" />
        <div className="tw:flex tw:grow tw:flex-col tw:gap-1.5">
          <Skeleton className="tw:h-4 tw:w-40" />
          <Skeleton className="tw:h-3 tw:w-28" />
        </div>
        <Skeleton className="tw:h-5 tw:w-12 tw:rounded-full" />
      </div>
      <div className="tw:flex tw:flex-col tw:gap-3 tw:px-4.5 tw:pt-5 tw:pb-5">
        <Skeleton className="tw:h-3 tw:w-20" />
        <Skeleton className="tw:h-1.5 tw:w-full tw:rounded-full" />
        <Skeleton className="tw:h-1.5 tw:w-full tw:rounded-full" />
        <Skeleton className="tw:h-1.5 tw:w-full tw:rounded-full" />
      </div>
      <div className="tw:flex tw:h-11 tw:items-center tw:justify-between tw:border-t tw:px-4.5">
        <Skeleton className="tw:h-3 tw:w-24" />
        <Skeleton className="tw:h-3 tw:w-20" />
      </div>
    </div>
  );
}
