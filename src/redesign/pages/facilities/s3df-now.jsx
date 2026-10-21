"use client";

import { cn } from "@/lib/utils";
import { ErrorAlert, Skeleton } from "../../kit";
import { formatPct, formatStorage } from "../../lib/format";

/*
 * "S3DF right now" (v2 dark panel). Built from purchased nodes per cluster (clusterPurchases)
 * and past-hour facilityRecentComputeUsage. Omitted until the API has them: the Jobs running
 * tile (no aggregate jobs API), Down / drained cells (no node-state API) and GPU model names.
 */

const COLS = 16;
const MAX_CELLS = 80; // 16 × 5, as in the artboard; bigger clusters draw one cell per N nodes

export function S3dfNow({ now, loading }) {
  return (
    <section
      aria-label="S3DF right now"
      className="tw:flex tw:flex-wrap tw:gap-x-8 tw:gap-y-5 tw:rounded-xl tw:bg-night tw:px-6 tw:py-5 tw:text-xs tw:text-primary-foreground tw:antialiased"
    >
      <div className="tw:flex tw:w-50 tw:shrink-0 tw:flex-col tw:justify-between tw:gap-4">
        <div className="tw:flex tw:flex-col tw:gap-1.5">
          <div className="tw:flex tw:items-center tw:gap-2">
            <span className={cn("tw:size-1.75 tw:shrink-0 tw:rounded-full", now?.hasLive ? "tw:bg-ok tw:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ok)_25%,transparent)]" : "tw:bg-primary-foreground/40")} aria-hidden />
            <span className="tw:font-mono tw:text-[11px] tw:leading-3.5 tw:font-medium tw:tracking-[0.12em] tw:text-primary-foreground/60 tw:uppercase">Live · past hour</span>
          </div>
          <h2 className="tw:text-xl tw:leading-6 tw:font-bold tw:tracking-[-0.015em]">S3DF right now</h2>
        </div>
        <ul className="tw:flex tw:flex-col tw:gap-1.5 tw:text-[11px] tw:leading-3.5 tw:text-primary-foreground/70">
          <Legend swatch="tw:bg-primary-foreground/80">Busy node</Legend>
          <Legend swatch="tw:bg-burst">Burst (over purchase)</Legend>
          <Legend swatch="tw:bg-primary-foreground/10">Idle node</Legend>
        </ul>
      </div>

      <div className="tw:grid tw:min-w-0 tw:grow tw:basis-0 tw:grid-cols-[repeat(auto-fill,minmax(128px,1fr))] tw:gap-x-6 tw:gap-y-4">
        {now?.error ? (
          <ErrorAlert error={now.error} onRetry={now.refetch} what="cluster status" className="tw:col-span-full" />
        ) : loading || !now || now.loading ? (
          Array.from({ length: 5 }, (_, i) => <RackSkeleton key={i} />)
        ) : (
          now.clusters.map((c) => <Rack key={c.name} cluster={c} />)
        )}
        {!loading && now && !now.loading && !now.error && !now.hasLive && (
          <p className="tw:col-span-full tw:text-[11px] tw:text-primary-foreground/60">No live job data in the past hour — showing purchased capacity only.</p>
        )}
      </div>

      <div className="tw:flex tw:w-37.5 tw:shrink-0 tw:flex-col tw:justify-end tw:border-l tw:border-primary-foreground/10 tw:pl-6">
        {loading || !now || now.storageLoading ? (
          <div className="tw:flex tw:flex-col tw:gap-1.5">
            <Skeleton className="tw:h-6 tw:w-20 tw:bg-primary-foreground/10" />
            <Skeleton className="tw:h-3 tw:w-24 tw:bg-primary-foreground/10" />
          </div>
        ) : (
          <div className="tw:flex tw:flex-col tw:gap-0.5">
            <span className="tw:font-mono tw:text-[22px] tw:leading-7 tw:font-medium tw:tabular-nums">{formatStorage(now.storage.usedGb)}</span>
            <span className="tw:text-[11px] tw:leading-3.5 tw:tracking-[0.06em] tw:text-primary-foreground/60 tw:uppercase">of {formatStorage(now.storage.purchasedGb)} stored</span>
          </div>
        )}
      </div>
    </section>
  );
}

function Legend({ swatch, children }) {
  return (
    <li className="tw:flex tw:items-center tw:gap-1.5">
      <span className={cn("tw:size-1.75 tw:shrink-0 tw:rounded-[1.5px]", swatch)} aria-hidden />
      {children}
    </li>
  );
}

function Rack({ cluster: c }) {
  const perCell = Math.max(1, Math.ceil(c.nodes / MAX_CELLS));
  const cells = Math.max(1, Math.ceil(c.nodes / perCell));
  const rows = Math.ceil(cells / COLS);
  const pct = c.pct ?? 0;
  const busy = Math.min(cells, Math.round((Math.min(pct, 100) / 100) * cells));
  const burst = pct > 100 ? Math.min(cells, Math.round(((pct - 100) / 100) * cells)) : 0;
  const kind = (i) => (i >= cells - burst ? "burst" : i < busy ? "busy" : "idle");
  const label = `${c.name}: ${c.pct == null ? "no live data" : `${formatPct(c.pct)} busy`}, ${c.nodes} purchased nodes`;
  return (
    <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-2.5">
      <div className="tw:flex tw:items-baseline tw:justify-between tw:font-mono tw:text-[13px] tw:leading-4">
        <span className="tw:truncate tw:font-semibold">{c.name}</span>
        <span className={cn("tw:font-medium tw:tabular-nums", pct > 100 ? "tw:text-burst-bg" : "tw:text-primary-foreground")}>{c.pct == null ? "—" : formatPct(c.pct)}</span>
      </div>
      <svg viewBox={`0 0 ${COLS * 10 - 2} ${rows * 10 - 2}`} className="tw:block tw:h-auto tw:w-full tw:max-w-40" role="img" aria-label={label}>
        {Array.from({ length: cells }, (_, i) => {
          const k = kind(i);
          return (
            <rect
              key={i}
              x={(i % COLS) * 10}
              y={Math.floor(i / COLS) * 10}
              width="8"
              height="8"
              rx="1"
              fill={k === "burst" ? "var(--burst)" : "var(--primary-foreground)"}
              fillOpacity={k === "burst" ? 1 : k === "busy" ? 0.8 : 0.08}
            />
          );
        })}
      </svg>
      <span className="tw:text-[11px] tw:leading-3.5 tw:text-primary-foreground/60">
        {c.gpu ? "GPU" : "CPU"} · {c.nodes} nodes{perCell > 1 ? ` · 1 cell = ${perCell}` : ""}
      </span>
    </div>
  );
}

function RackSkeleton() {
  return (
    <div className="tw:flex tw:flex-col tw:gap-2.5" aria-hidden>
      <div className="tw:flex tw:justify-between">
        <Skeleton className="tw:h-4 tw:w-14 tw:bg-primary-foreground/10" />
        <Skeleton className="tw:h-4 tw:w-8 tw:bg-primary-foreground/10" />
      </div>
      <Skeleton className="tw:h-12 tw:w-full tw:max-w-40 tw:bg-primary-foreground/10" />
      <Skeleton className="tw:h-3 tw:w-20 tw:bg-primary-foreground/10" />
    </div>
  );
}
