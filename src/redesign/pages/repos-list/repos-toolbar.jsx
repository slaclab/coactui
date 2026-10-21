"use client";

import Link from "next/link";
import { Download, SlidersHorizontal } from "lucide-react";
import { ColumnsMenu, FacetFilter, ResetButton, SearchInput, Segmented, ToggleFacet, Toolbar, ToolbarButton } from "../../kit";
import { downloadCsv } from "../../lib/csv";
import { useQueryParam } from "../../lib/navigation";

export const VIEWS = ["overview", "compute", "storage"];

/** ?view= preset (Overview default, kept out of the URL). */
export function useView() {
  const [raw, setView] = useQueryParam("view", "overview");
  return [VIEWS.includes(raw) ? raw : "overview", setView];
}

/** Overview · Compute · Storage column presets (spec R3 right). */
export function PresetToggle() {
  const [view, setView] = useView();
  return (
    <Segmented
      label="Column preset"
      value={view}
      onChange={setView}
      items={[
        { value: "overview", label: "Overview" },
        { value: "compute", label: "Compute" },
        { value: "storage", label: "Storage" },
      ]}
    />
  );
}

/**
 * The one toolbar for every preset: search, Facility / My role facets, Needs attention,
 * Reset, preset toggle, View (columns) and Export. `filters` comes from useRepoFilters.
 *   csv = { filename, columns } — exports the table's filtered rows.
 */
export function ReposToolbar({ table, filters, columnLabels, csv, showAttention = true, showPresets = true }) {
  return (
    <Toolbar
      start={
        <>
          <SearchInput value={filters.q} onChange={filters.setQ} placeholder="Filter repos, PIs, groups…" />
          <FacetFilter label="Facility" options={filters.countBy("facility")} selected={filters.facilities} onChange={filters.setFacilities} />
          <FacetFilter label="My role" options={filters.countBy("role")} selected={filters.roles} onChange={filters.setRoles} />
          {showAttention && <ToggleFacet label="Needs attention" count={filters.attnCount} pressed={filters.attn} onChange={filters.setAttn} />}
          {filters.active ? <ResetButton onClick={filters.reset} /> : null}
        </>
      }
      end={
        <>
          {showPresets && <PresetToggle />}
          {columnLabels && <ColumnsMenu table={table} labels={columnLabels} trigger={<><SlidersHorizontal className="tw:size-3.5 tw:text-muted-strong" /> View</>} />}
          {csv && (
            <ToolbarButton icon={Download} onClick={() => downloadCsv(csv.filename, csv.columns, table.getFilteredRowModel().rows.map((r) => r.original))}>
              Export
            </ToolbarButton>
          )}
        </>
      }
    />
  );
}

/** Repo name cell: a real link to ?peek= (spec R4). Continuation rows (same repo, next cluster/purpose) repeat it muted. */
export function RepoNameCell({ row, href, muted }) {
  return (
    <div className="tw:flex tw:min-w-48 tw:items-center tw:gap-2">
      <Link
        href={href}
        scroll={false}
        title={row.name}
        className={
          muted
            ? "tw:truncate tw:font-mono tw:text-sm tw:text-muted-foreground tw:no-underline tw:hover:underline"
            : "tw:truncate tw:font-mono tw:text-sm tw:font-medium tw:text-foreground tw:no-underline tw:hover:underline"
        }
      >
        {row.name}
      </Link>
      {row.name === "default" && !muted && (
        <span className="tw:flex tw:h-5 tw:shrink-0 tw:items-center tw:rounded-full tw:bg-neutral-bg tw:px-2 tw:text-xs tw:font-semibold tw:text-muted-strong">Facility access</span>
      )}
    </div>
  );
}
