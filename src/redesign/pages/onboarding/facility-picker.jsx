"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { orderFacilities } from "./register-state";

const FIRST = 3;

/**
 * Facility radio list (Paper 6QR-0): three facilities first (described ones lead), then
 * "Show all N facilities". The expansion is transient UI; the selection belongs to the form.
 */
export function FacilityPicker({ facilities, value, onChange, invalid, describedBy, disabled }) {
  const [expanded, setExpanded] = useState(false);
  const ordered = orderFacilities(facilities);
  const head = ordered.slice(0, FIRST);
  // Collapsed, a selection made from a deep link stays visible even if it isn't in the top 3.
  const visible = expanded ? ordered : value && !head.some((f) => f.name === value) ? [...head, ...ordered.filter((f) => f.name === value)] : head;
  return (
    <div className="tw:flex tw:flex-col tw:gap-2">
      <RadioGroupPrimitive.Root
        value={value ?? ""}
        onValueChange={onChange}
        aria-label="Facility"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        className="tw:flex tw:flex-col tw:gap-2"
      >
        {visible.map((f) => (
          <FacilityOption key={f.name} facility={f} />
        ))}
      </RadioGroupPrimitive.Root>
      {ordered.length > FIRST && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="tw:w-fit tw:pt-0.5 tw:text-[13px] tw:font-medium tw:text-muted-strong tw:hover:text-foreground"
        >
          {expanded ? "Show fewer" : `Show all ${ordered.length} facilities`}
        </button>
      )}
    </div>
  );
}

export function FacilityOption({ facility }) {
  return (
    <RadioGroupPrimitive.Item
      value={facility.name}
      className={cn(
        "tw:group tw:flex tw:w-full tw:items-center tw:gap-3 tw:rounded-lg tw:border tw:border-border tw:px-3 tw:py-2.5 tw:text-left tw:outline-none",
        "tw:hover:bg-primary-foreground tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/30 tw:disabled:cursor-not-allowed tw:disabled:opacity-60",
        "tw:data-[state=checked]:border-primary tw:data-[state=checked]:bg-primary-foreground tw:data-[state=checked]:shadow-[0_0_0_0.5px_var(--primary)]",
      )}
    >
      <span
        aria-hidden
        className="tw:flex tw:size-9 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-md tw:border tw:bg-primary-foreground tw:font-mono tw:text-[11px] tw:font-semibold tw:text-primary-text tw:group-data-[state=checked]:border-foreground tw:group-data-[state=checked]:bg-foreground tw:group-data-[state=checked]:text-primary-foreground"
      >
        {facility.name.slice(0, 2).toUpperCase()}
      </span>
      <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-0.5">
        <span className="tw:text-sm tw:leading-4.5 tw:font-semibold tw:text-foreground">{facility.name}</span>
        {facility.description && <span className="tw:truncate tw:text-xs tw:leading-4 tw:text-muted-foreground">{facility.description}</span>}
      </span>
      <span
        aria-hidden
        className="tw:flex tw:size-4.5 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:border-[1.5px] tw:border-border tw:group-data-[state=checked]:border-primary tw:group-data-[state=checked]:bg-primary"
      >
        <Check className="tw:hidden tw:size-2.5 tw:text-primary-foreground tw:group-data-[state=checked]:block" strokeWidth={3.5} />
      </span>
    </RadioGroupPrimitive.Item>
  );
}
