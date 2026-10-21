import { cn } from "@/lib/utils";
import slacMark from "../../../images/SLAC_primary_red_small.png";

/**
 * Facility logo tile (v2 "SLAC default"). There is no logo field or upload API yet, so every
 * facility shows the SLAC mark placeholder. size: 40 (card) | 24 (table).
 */
export function FacilityMark({ size = 40, className }) {
  return (
    <span
      aria-hidden
      className={cn(
        "tw:flex tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:border tw:bg-primary-foreground",
        size === 24 ? "tw:size-6 tw:rounded-md" : "tw:size-10",
        className,
      )}
    >
      <img src={slacMark.src} alt="" className={cn("tw:block tw:h-auto", size === 24 ? "tw:w-4" : "tw:w-7")} />
    </span>
  );
}
