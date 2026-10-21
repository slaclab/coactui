"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MeterBar, meterStatus, Skeleton, StatusPill, STATUS_TEXT } from "../../kit";
import { formatPct } from "../../lib/format";

const DOT = { crit: "tw:bg-crit", burst: "tw:bg-burst", warn: "tw:bg-warn", neutral: "tw:bg-muted-foreground", ok: "tw:bg-ok" };

/** Health pill as a button; the Popover names the rule that fired (spec §2, G0 artboard). */
export function HealthBadge({ health, facility, className }) {
  if (!health) return <Skeleton className="tw:h-5 tw:w-12 tw:rounded-full" />;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${facility} health: ${health.label}. Show reason`}
          className={cn("tw:relative tw:z-10 tw:rounded-full tw:outline-none tw:focus-visible:ring-2 tw:focus-visible:ring-ring/40", className)}
        >
          <StatusPill tone={health.tone} className="tw:h-6 tw:cursor-pointer">{health.label}</StatusPill>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        // Portaled, but React still bubbles its clicks to the table row (onRowClick): stop them here.
        onClick={(e) => e.stopPropagation()}
        className="tw:flex tw:w-72 tw:flex-col tw:gap-3 tw:rounded-lg tw:bg-background tw:p-4">
        <div className="tw:flex tw:items-center tw:gap-2 tw:text-sm tw:font-semibold">
          <span className={cn("tw:size-2 tw:rounded-full", DOT[health.tone])} aria-hidden />
          {health.label}
        </div>
        {health.reasons.map((r, i) => (
          <div key={i} className="tw:flex tw:flex-col tw:gap-2">
            <p className="tw:text-[13px] tw:leading-5">{r.text}</p>
            {r.metric && <ReasonMeter metric={r.metric} />}
            <p className="tw:text-xs tw:text-muted-foreground">{r.rule}</p>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function ReasonMeter({ metric }) {
  const status = meterStatus(metric.type, metric.pct, metric.burst ?? 0);
  return (
    <div className="tw:flex tw:flex-col tw:gap-1.5">
      <div className="tw:flex tw:items-center tw:justify-between tw:text-xs">
        <span className="tw:font-mono tw:text-muted-strong">{metric.label}</span>
        <span className={cn("tw:font-mono tw:font-medium tw:tabular-nums", STATUS_TEXT[status] ?? "tw:text-foreground")}>
          {formatPct(metric.pct)}{status === "crit" ? " !" : ""}
        </span>
      </div>
      <MeterBar pct={metric.pct} status={status} className="tw:h-2 tw:w-full" />
    </div>
  );
}
