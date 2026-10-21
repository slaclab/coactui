"use client";

import { cn } from "@/lib/utils";
import { useMounted } from "../providers/apollo";

import { formatPct, sig3 } from "../lib/format";

export { formatPct };
/** @deprecated use sig3 from lib/format */
export const formatTB = (v) => (v == null ? "—" : sig3(v));

// Status from the spec's threshold rules, on the displayed (rounded) value.
export function meterStatus(type, pct, burst = 0) {
  const shown = Math.round(pct);
  if (type === "storage") return shown >= 95 ? "crit" : shown >= 80 ? "warn" : null;
  if (type === "compute-used") return shown > 100 + burst ? "crit" : shown > 100 ? "burst" : null;
  return shown > 100 ? "crit" : null; // compute-allocated
}

const FILL = { crit: "tw:bg-crit", warn: "tw:bg-warn", burst: "tw:bg-burst" };
export const STATUS_TEXT = { crit: "tw:text-crit-text", warn: "tw:text-warn-text", burst: "tw:text-burst-text" };

// v2 motion budget: meters fill from 0 the first time they are seen (600 ms ease-out) and
// tween from the old value afterwards. Reduced motion makes it instant (globals.css).
// "Seen" = after hydration: the server renders 0 width, the client then animates to value.
const useFirstFill = useMounted;

export function MeterBar({ pct, status, className }) {
  const ready = useFirstFill();
  return (
    <div className={cn("tw:relative tw:h-1.5 tw:w-18 tw:shrink-0 tw:overflow-hidden tw:rounded-full tw:bg-muted", className)}>
      <div
        className={cn(
          "tw:h-full tw:rounded-full tw:transition-[width] tw:duration-600 tw:ease-out",
          FILL[status] ?? "tw:bg-meter",
        )}
        style={{ width: ready ? `${Math.min(Math.max(pct, 0), 100)}%` : 0 }}
      />
    </div>
  );
}

// sm AllocationMeter for table cells: bar + value; status colours only when a rule fires.
// Scale is 0-100% of the allocation; anything past 100% is carried by colour and the number.
export function AllocationMeter({ type, pct, burst = 0, label, children }) {
  const status = meterStatus(type, pct, burst);
  const overCap = status === "crit" && type !== "storage";
  return (
    <div className="tw:flex tw:items-center tw:gap-2.5">
      <div
        role={overCap ? "img" : "meter"}
        aria-valuemin={overCap ? undefined : 0}
        aria-valuemax={overCap ? undefined : 100 + burst}
        aria-valuenow={overCap ? undefined : Math.round(pct)}
        aria-label={label}
      >
        <MeterBar pct={pct} status={status} />
      </div>
      <span className={cn("tw:text-[13px] tw:leading-5 tw:tabular-nums", status ? cn("tw:font-medium", STATUS_TEXT[status]) : "tw:text-foreground", type === "compute-used" && "tw:font-medium")}>
        {children ?? formatPct(pct)}
      </span>
    </div>
  );
}
