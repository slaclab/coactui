"use client";

import { SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColumnsMenu, FacetFilter, ResetButton, SearchInput, Toolbar } from "../../kit";
import { HEALTH, HEALTH_KEYS } from "./health";

export const SORTS = [
  { value: "name", label: "Name" },
  { value: "health", label: "Health" },
  { value: "storage", label: "Storage used" },
  { value: "pending", label: "Pending" },
];

export const COLUMN_LABELS = {
  health: "Health",
  computeUsed: "Compute used · 7d",
  computeAllocated: "Compute allocated",
  storage: "Storage",
  repos: "Repos",
  pending: "Pending",
  czars: "Czars",
  serviceaccount: "Service account",
};

/**
 * Shared F2 toolbar for Cards and Table. `filters` = { q, setQ, health, setHealth, sort,
 * setSort, reset, active } from URL state; `counts` per health key; `table` only in Table view.
 */
export function FacilitiesToolbar({ filters, counts, shown, table }) {
  const options = HEALTH_KEYS.map((k) => ({ value: k, label: HEALTH[k].label, count: counts?.[k] }));
  return (
    <Toolbar
      className="tw:pt-0"
      start={
        <>
          <SearchInput value={filters.q} onChange={filters.setQ} placeholder="Filter facilities…" width="tw:w-64" />
          <FacetFilter label="Health" options={options} selected={filters.health} onChange={filters.setHealth} />
          {filters.active ? <ResetButton onClick={filters.reset} /> : null}
        </>
      }
      end={
        <>
          {shown != null && <span className="tw:text-[13px] tw:text-muted-foreground tw:tabular-nums">{shown} {shown === 1 ? "facility" : "facilities"}</span>}
          <span className="tw:ml-2 tw:text-[13px] tw:text-muted-foreground">Sort by</span>
          <Select value={filters.sort} onValueChange={filters.setSort}>
            <SelectTrigger size="sm" className="tw:h-8 tw:min-w-28 tw:bg-background tw:text-[13px] tw:font-medium" aria-label="Sort facilities">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {table && <ColumnsMenu table={table} labels={COLUMN_LABELS} trigger={<><SlidersHorizontal className="tw:size-3.5 tw:text-muted-strong" /> View</>} />}
        </>
      }
    />
  );
}
