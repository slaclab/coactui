"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQueryParam } from "../../lib/navigation";

/** Compute preset switches (spec R3b), all URL state: ?preempt=1 ?unused=1 ?pct=1. */
export function useComputeOptions() {
  const [preempt, setPreempt] = useQueryParam("preempt", "");
  const [unused, setUnused] = useQueryParam("unused", "");
  const [pct, setPct] = useQueryParam("pct", "");
  return {
    includePreempt: !!preempt,
    hideUnused: !!unused,
    pctOfRepo: !!pct,
    setIncludePreempt: (on) => setPreempt(on ? "1" : ""),
    setHideUnused: (on) => setUnused(on ? "1" : ""),
    setPctOfRepo: (on) => setPct(on ? "1" : ""),
  };
}

function Toggle({ id, label, title, checked, onChange }) {
  return (
    <div className="tw:flex tw:items-center tw:gap-2" title={title}>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="tw:text-[13px] tw:font-normal">{label}</Label>
    </div>
  );
}

export function ComputeOptions({ options }) {
  return (
    <div className="tw:mb-3 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-x-6 tw:gap-y-2 tw:rounded-lg tw:border tw:bg-background tw:px-3.5 tw:py-2.5">
      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-6">
        <Toggle id="opt-preempt" label="Include preemptable" title="Include usage from preemptable jobs in the Live columns" checked={options.includePreempt} onChange={options.setIncludePreempt} />
        <Toggle id="opt-unused" label="Hide unused (30d)" title="Hide allocations with no usage in the last 30 days of the daily rollup" checked={options.hideUnused} onChange={options.setHideUnused} />
        <Toggle id="opt-pct" label="Show as % of repo allocation" title="Show Live usage as a percentage of the repo's allocation instead of the facility's purchase" checked={options.pctOfRepo} onChange={options.setPctOfRepo} />
      </div>
      <span className="tw:text-xs tw:text-muted-foreground">Live (jobs): hour · day · week · Daily rollup: 30 days · total</span>
    </div>
  );
}
