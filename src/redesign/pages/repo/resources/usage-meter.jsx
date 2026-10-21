"use client";

import { cn } from "@/lib/utils";
import { meterStatus, STATUS_TEXT } from "../../../kit";
import { formatPct } from "../../../lib/format";
import { useMounted } from "../../../providers/apollo";

/*
 * md compute/storage meter (spec §2 AllocationMeter md): 8px bar on a track with a 1px inset,
 * optional label row above. compute-used: zinc up to 100%, a divider at 100% and a violet
 * burst segment up to the burst cap, red past the cap. storage: warn ≥ 80, crit ≥ 95.
 * Built here until the kit has an md variant (kit request).
 */
export function UsageMeter({ type = "compute-used", pct, burstPct = 0, label, value, ariaLabel, className, barClassName }) {
  const ready = useMounted();
  const status = pct == null ? null : meterStatus(type, pct, burstPct);
  const compute = type === "compute-used";
  const scaleMax = compute ? 100 + Math.max(0, burstPct) : 100;
  const v = Math.max(0, pct ?? 0);
  const overCap = compute && v > scaleMax;
  const w = (x) => (ready ? `${(Math.min(x, scaleMax) / scaleMax) * 100}%` : 0);
  const base = overCap ? "tw:bg-crit" : type === "storage" && status === "crit" ? "tw:bg-crit" : type === "storage" && status === "warn" ? "tw:bg-warn" : "tw:bg-meter";

  return (
    <div className={cn("tw:flex tw:flex-col tw:gap-1.5", className)}>
      {(label || value) && (
        <div className="tw:flex tw:items-baseline tw:justify-between tw:gap-3 tw:text-[13px] tw:leading-4.5 tw:font-medium">
          <span>{label}</span>
          <span className={cn("tw:tabular-nums", status && STATUS_TEXT[status])}>{value}</span>
        </div>
      )}
      <div
        role={overCap ? "img" : "meter"}
        aria-valuemin={overCap ? undefined : 0}
        aria-valuemax={overCap ? undefined : Math.round(scaleMax)}
        aria-valuenow={overCap || pct == null ? undefined : Math.round(v)}
        aria-label={ariaLabel ?? `${label ?? "Used"} ${formatPct(pct)}`}
        className={cn("tw:relative tw:flex tw:h-2 tw:w-full tw:shrink-0 tw:overflow-hidden tw:rounded-full tw:bg-muted tw:shadow-[inset_0_0_0_1px_var(--border)]", barClassName)}
      >
        <div className={cn("tw:h-full tw:rounded-full tw:transition-[width] tw:duration-600 tw:ease-out", base)} style={{ width: w(overCap ? scaleMax : Math.min(v, 100)) }} />
        {compute && !overCap && v > 100 && (
          <div className="tw:absolute tw:inset-y-0 tw:rounded-r-full tw:bg-burst tw:transition-[width] tw:duration-600 tw:ease-out" style={{ left: w(100), width: ready ? `${((Math.min(v, scaleMax) - 100) / scaleMax) * 100}%` : 0 }} />
        )}
        {compute && burstPct > 0 && (
          <span className="tw:absolute tw:inset-y-0 tw:w-px tw:bg-muted-foreground" style={{ left: `${(100 / scaleMax) * 100}%` }} aria-hidden />
        )}
      </div>
    </div>
  );
}
