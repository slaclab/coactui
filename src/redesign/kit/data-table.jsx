"use client";

import { useEffect, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CirclePlus, Search, X } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Kbd } from "./primitives";
import { SkeletonRows } from "./states";

/* ======================================================================================
 * DataTable — the one table for every list (spec §1 "one way in per row", §6 R4/R5/R6).
 *
 * Owns only presentation state that has no home elsewhere: sorting, row selection, column
 * visibility, pagination. Filtering is the caller's: pass already-filtered `data` (usually
 * derived from URL state with useMemo) and `globalFilter` for the search box.
 *
 *   <DataTable
 *     columns={columns}                  // TanStack column defs (use sortHeader() for headers)
 *     data={rows} getRowId={(r) => r.id}
 *     loading={loading} skeleton={["tw:w-40", "tw:w-12", …]}
 *     globalFilter={q} globalFilterFn={(row, q) => …}
 *     enableRowSelection={(row) => canSelect(row)}   // adds the checkbox column
 *     bulkActions={({ selected, table }) => <>…</>}  // floating bar while selection > 0
 *     onRowClick={(row) => router.push(…)}            // redundant way in (ignored on controls)
 *     rowClassName={(row) => …} empty={<>No repos match …</>}
 *     initialSorting={[{ id: "name", desc: false }]} pageSizes={[25, 50, 100]}
 *     sorting={…} onSortingChange={…}          // optional: control sorting (e.g. ?sort=)
 *     footerLabel={(filtered, total) => `${filtered} rows`}
 *     toolbar={(table) => <Toolbar start={…} end={<ColumnsMenu table={table} …/>} />}
 *   />
 * ====================================================================================== */

export function DataTable({
  columns: userColumns,
  data,
  getRowId,
  loading = false,
  skeleton,
  globalFilter,
  globalFilterFn,
  enableRowSelection,
  bulkActions,
  onRowClick,
  rowClassName,
  empty = "Nothing to show.",
  initialSorting = [],
  sorting: controlledSorting,
  onSortingChange,
  footerLabel,
  initialColumnVisibility = {},
  pageSizes = [25, 50, 100],
  defaultPageSize = 50,
  footer = true,
  toolbar,
  tableClassName,
}) {
  // Sorting is internal unless the caller controls it (e.g. from ?sort= via useQueryParam).
  const [ownSorting, setOwnSorting] = useState(initialSorting);
  const sorting = controlledSorting ?? ownSorting;
  const setSorting = (updater) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    if (onSortingChange) onSortingChange(next);
    else setOwnSorting(next);
  };
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState(initialColumnVisibility);

  const columns = enableRowSelection ? [selectColumn, ...userColumns] : userColumns;
  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting, rowSelection, columnVisibility, globalFilter },
    enableRowSelection: enableRowSelection ? (row) => enableRowSelection(row.original) : false,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: globalFilterFn ? (row, _id, value) => globalFilterFn(row.original, String(value ?? "").toLowerCase()) : "includesString",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: defaultPageSize } },
    autoResetPageIndex: true,
  });

  const selected = table.getSelectedRowModel().rows.map((r) => r.original);
  const filteredRows = table.getFilteredRowModel().rows;
  const selectableCount = filteredRows.filter((r) => r.getCanSelect()).length;
  useEscapeToClear(selected.length > 0, () => table.resetRowSelection());

  const handleRowClick = (e, row) => {
    if (!onRowClick || window.getSelection()?.toString()) return;
    if (e.target.closest("a,button,input,label,select,textarea,[role=checkbox],[role=menuitem]")) return;
    onRowClick(row.original);
  };

  return (
    <div className="tw:flex tw:flex-col">
      {typeof toolbar === "function" ? toolbar(table) : toolbar}
      <div className="tw:overflow-x-auto tw:rounded-lg tw:border tw:bg-background">
        <table className={cn("tw:w-full tw:border-collapse tw:text-sm", tableClassName)}>
          <thead className="tw:sticky tw:top-0 tw:z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="tw:h-10 tw:border-b tw:bg-muted/60">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    style={h.column.columnDef.size && h.column.columnDef.size !== 150 ? { width: h.getSize() } : undefined}
                    className={cn("tw:px-3 tw:text-left tw:text-[13px] tw:font-medium tw:whitespace-nowrap tw:text-muted-strong", h.column.columnDef.meta?.headerClassName)}
                  >
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows widths={skeleton ?? columns.map(() => "tw:w-16")} />
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  onClick={(e) => handleRowClick(e, row)}
                  className={cn(
                    "tw:h-12 tw:border-b tw:last:border-b-0",
                    row.getIsSelected() ? "tw:bg-brand-bg/45" : "tw:hover:bg-muted/40",
                    onRowClick && "tw:cursor-default",
                    rowClassName?.(row.original),
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={cn("tw:px-3", cell.column.columnDef.meta?.cellClassName)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="tw:h-24 tw:text-center tw:text-[13px] tw:text-muted-foreground">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {footer && <TableFooter table={table} total={data.length} selectedCount={selected.length} pageSizes={pageSizes} label={footerLabel} />}

      {bulkActions && selected.length > 0 && (
        <BulkBar count={selected.length} selectableCount={selectableCount} onSelectAll={() => table.toggleAllRowsSelected(true)} onClear={() => table.resetRowSelection()}>
          {bulkActions({ selected, table })}
        </BulkBar>
      )}
    </div>
  );
}

// Esc closes an open menu or dialog first; only a bare Esc clears the selection.
function useEscapeToClear(active, clear) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector("[role=menu], [role=dialog], [role=alertdialog], [role=listbox]")) return;
      clear();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, clear]);
}

const selectColumn = {
  id: "select",
  header: ({ table }) => (
    <Checkbox
      aria-label="Select all on this page"
      checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
      onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
    />
  ),
  cell: ({ row }) => (
    <Checkbox aria-label="Select row" checked={row.getIsSelected()} disabled={!row.getCanSelect()} onCheckedChange={(v) => row.toggleSelected(!!v)} />
  ),
  enableSorting: false,
  enableHiding: false,
  size: 44,
  meta: { headerClassName: "tw:px-0 tw:text-center tw:w-11", cellClassName: "tw:px-0 tw:text-center tw:w-11" },
};

/** Sortable column header. Usage: `header: sortHeader("Repo")`. */
export function sortHeader(label, { align } = {}) {
  return function SortHeader({ column }) {
    const dir = column.getIsSorted();
    return (
      <button
        type="button"
        onClick={column.getToggleSortingHandler()}
        className={cn("tw:inline-flex tw:items-center tw:gap-1 tw:font-medium tw:text-muted-strong tw:hover:text-foreground", align === "right" && "tw:ml-auto tw:flex")}
      >
        {label}
        {dir === "asc" && <ArrowDown className="tw:size-3 tw:text-foreground" strokeWidth={2.5} />}
        {dir === "desc" && <ArrowUp className="tw:size-3 tw:text-foreground" strokeWidth={2.5} />}
      </button>
    );
  };
}

const pagerButton = "tw:flex tw:size-8 tw:items-center tw:justify-center tw:rounded-md tw:border tw:bg-background tw:text-muted-strong tw:hover:bg-muted tw:disabled:opacity-40 tw:disabled:hover:bg-background";

function TableFooter({ table, total, selectedCount, pageSizes, label }) {
  const filtered = table.getFilteredRowModel().rows.length;
  return (
    <div className="tw:flex tw:h-13 tw:items-center tw:justify-between tw:text-[13px]">
      <span className="tw:tabular-nums">{selectedCount ? `${selectedCount} of ${total} selected` : label ? label(filtered, total) : `${filtered} of ${total}`}</span>
      {table.getPageCount() > 1 || filtered > pageSizes[0] ? (
        <div className="tw:flex tw:items-center tw:gap-5">
          <label className="tw:flex tw:items-center tw:gap-2 tw:font-medium">
            Rows per page
            <select value={table.getState().pagination.pageSize} onChange={(e) => table.setPageSize(Number(e.target.value))} className="tw:h-8 tw:rounded-md tw:border tw:bg-background tw:px-2">
              {pageSizes.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <span className="tw:font-medium tw:tabular-nums">Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span>
          <div className="tw:flex tw:gap-1.5">
            <button type="button" className={pagerButton} onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><ChevronsLeft className="tw:size-3.5" /><span className="tw:sr-only">First page</span></button>
            <button type="button" className={pagerButton} onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft className="tw:size-3.5" /><span className="tw:sr-only">Previous page</span></button>
            <button type="button" className={pagerButton} onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight className="tw:size-3.5" /><span className="tw:sr-only">Next page</span></button>
            <button type="button" className={pagerButton} onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}><ChevronsRight className="tw:size-3.5" /><span className="tw:sr-only">Last page</span></button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------- Bulk bar (R6) -------------------------------------- */

export function BulkBar({ count, selectableCount, onSelectAll, onClear, children }) {
  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="tw:fixed tw:bottom-6 tw:left-1/2 tw:z-50 tw:flex tw:h-12 tw:-translate-x-1/2 tw:items-center tw:gap-1 tw:rounded-[12px] tw:border tw:bg-background tw:pr-1.5 tw:pl-3.5 tw:shadow-[0_10px_30px_rgb(20_24_28/0.12),0_2px_6px_rgb(20_24_28/0.06)] tw:animate-in tw:fade-in-0 tw:slide-in-from-bottom-1 tw:duration-150"
    >
      <span className="tw:text-[13px] tw:font-semibold tw:tabular-nums">{count} selected</span>
      <Kbd className="tw:ml-1">Esc</Kbd>
      <BulkSeparator />
      {count < selectableCount && (
        <>
          <BulkButton onClick={onSelectAll}>Select all {selectableCount}</BulkButton>
          <BulkSeparator />
        </>
      )}
      {children}
      <BulkSeparator />
      <button type="button" className="tw:flex tw:size-8 tw:items-center tw:justify-center tw:rounded-md tw:hover:bg-muted" onClick={onClear}>
        <X className="tw:size-3.5 tw:text-muted-strong" />
        <span className="tw:sr-only">Clear selection</span>
      </button>
    </div>
  );
}

export const BulkSeparator = () => <span className="tw:mx-1 tw:h-5 tw:w-px tw:bg-border" aria-hidden />;

/** variant: "ghost" (default) | "primary" (the one red action, e.g. "Add member…"). */
export function BulkButton({ icon: Icon, variant = "ghost", children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "tw:flex tw:h-8 tw:items-center tw:gap-1.5 tw:rounded-md tw:px-2.5 tw:text-[13px] tw:font-medium tw:disabled:opacity-50",
        variant === "primary" ? "tw:bg-primary tw:text-primary-foreground tw:hover:bg-primary-hover" : "tw:hover:bg-muted",
      )}
    >
      {Icon && <Icon className={cn("tw:size-3.5", variant !== "primary" && "tw:text-muted-strong")} />}
      {children}
    </button>
  );
}

/* ------------------------------- Toolbar parts (R3) --------------------------------- */

export function Toolbar({ start, end, className }) {
  return (
    <div className={cn("tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:pt-4 tw:pb-3", className)}>
      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">{start}</div>
      <div className="tw:flex tw:items-center tw:gap-2">{end}</div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Filter…", width = "tw:w-70", label }) {
  return (
    <label className={cn("tw:flex tw:h-8 tw:items-center tw:gap-2 tw:rounded-md tw:border tw:bg-primary-foreground tw:px-2.5 tw:focus-within:ring-2 tw:focus-within:ring-ring/40", width)}>
      <Search className="tw:size-3.5 tw:shrink-0 tw:text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className="tw:w-full tw:bg-transparent tw:text-[13px] tw:outline-none tw:placeholder:text-muted-foreground"
      />
    </label>
  );
}

const facetButton = "tw:flex tw:h-8 tw:items-center tw:gap-1.5 tw:rounded-md tw:border tw:px-2.5 tw:text-[13px] tw:font-medium tw:text-foreground";
const facetCount = "tw:flex tw:h-5 tw:items-center tw:rounded tw:bg-neutral-bg tw:px-1.5 tw:text-xs tw:font-semibold tw:text-muted-strong";

/** Multi-select faceted filter: options = [{ value, label?, count? }]; selected = string[]. */
export function FacetFilter({ label, options, selected, onChange }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(facetButton, "tw:border-dashed tw:hover:bg-background")}>
        <CirclePlus className="tw:size-3.5 tw:text-muted-strong" />
        {label}
        {selected.length > 0 && (
          <>
            <span className="tw:h-3.5 tw:w-px tw:bg-border" />
            <span className={facetCount}>{selected.length === 1 ? (options.find((o) => o.value === selected[0])?.label ?? selected[0]) : selected.length}</span>
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="tw:max-h-80 tw:w-56">
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={selected.includes(o.value)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(on) => onChange(on ? [...selected, o.value] : selected.filter((v) => v !== o.value))}
          >
            {o.label ?? o.value}
            {o.count != null && <span className="tw:ml-auto tw:text-xs tw:text-muted-foreground tw:tabular-nums">{o.count}</span>}
          </DropdownMenuCheckboxItem>
        ))}
        {selected.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>Clear filter</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** On/off facet with a count (e.g. "Needs attention 3"). */
export function ToggleFacet({ label, count, pressed, onChange }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className={cn(facetButton, pressed ? "tw:border-solid tw:border-primary tw:bg-brand-bg/45" : "tw:border-dashed tw:hover:bg-background")}
    >
      <CirclePlus className="tw:size-3.5 tw:text-muted-strong" />
      {label}
      {count != null && (
        <>
          <span className="tw:h-3.5 tw:w-px tw:bg-border" />
          <span className={facetCount}>{count}</span>
        </>
      )}
    </button>
  );
}

export function ResetButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="tw:flex tw:h-8 tw:items-center tw:gap-1 tw:rounded-md tw:px-2 tw:text-[13px] tw:font-medium tw:text-muted-strong tw:hover:bg-muted">
      Reset <X className="tw:size-3.5" />
    </button>
  );
}

export const toolbarButtonClass =
  "tw:flex tw:h-8 tw:items-center tw:gap-1.5 tw:rounded-md tw:border tw:bg-background tw:px-2.5 tw:text-[13px] tw:font-medium tw:text-foreground tw:hover:bg-muted tw:disabled:opacity-50";

export function ToolbarButton({ icon: Icon, children, ...props }) {
  return (
    <button type="button" {...props} className={toolbarButtonClass}>
      {Icon && <Icon className="tw:size-3.5 tw:text-muted-strong" />}
      {children}
    </button>
  );
}

/** "View" menu: column visibility checkboxes. labels = { columnId: "Label" }. */
export function ColumnsMenu({ table, labels, trigger }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={toolbarButtonClass}>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="tw:w-48">
        {table
          .getAllLeafColumns()
          .filter((c) => c.getCanHide() && labels[c.id])
          .map((c) => (
            <DropdownMenuCheckboxItem key={c.id} checked={c.getIsVisible()} onSelect={(e) => e.preventDefault()} onCheckedChange={(v) => c.toggleVisibility(!!v)}>
              {labels[c.id]}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
