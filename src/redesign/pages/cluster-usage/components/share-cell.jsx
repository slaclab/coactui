import { cn } from "@/lib/utils";
import { MeterBar, meterStatus, STATUS_TEXT } from "../../../kit";
import { formatPct } from "../../../lib/format";

/**
 * Meter + percent cell for the usage tables. type "compute-used" colours burst/over-purchase
 * (facility vs its purchase); "share" is a neutral share of the cluster.
 */
export function ShareCell({ pct, type = "share", label, empty = "—", wide = false }) {
  if (pct == null) return <span className="tw:text-[13px] tw:text-muted-foreground">{empty}</span>;
  const status = type === "compute-used" ? meterStatus("compute-used", pct, 0) : null;
  return (
    <div className="tw:flex tw:items-center tw:gap-2.5" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={label}>
      <MeterBar pct={pct} status={status} className={cn("tw:shadow-[inset_0_0_0_1px_var(--border)]", wide ? "tw:w-50" : "tw:w-24")} />
      <span className={cn("tw:text-[13px] tw:font-medium tw:tabular-nums", STATUS_TEXT[status])}>{formatPct(pct)}</span>
    </div>
  );
}
